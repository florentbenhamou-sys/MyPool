import "server-only";
import type { Prisma, ProposalStatus } from "@prisma/client";
import { computeCustomerPrice } from "@/domain/pricing";
import { fromDateInput } from "@/lib/format";
import { t } from "@/lib/i18n";
import {
  LOCKED_PROPOSAL_STATUSES,
  type CatalogLineData,
  type OptionLineData,
  type ProposalData,
  type ScenarioData,
} from "@/lib/validation/proposal";
import { prisma } from "../db";
import { DomainError, NotFoundError } from "../errors";
import { recordAudit } from "./audit";
import { isUniqueViolation } from "./prisma-errors";

type Tx = Prisma.TransactionClient;

// -----------------------------------------------------------------------------
// Lecture
// -----------------------------------------------------------------------------

const lineOrder = { orderBy: { order: "asc" as const } };

/** Arbre complet d'une proposition : produits → scénarios → lignes. */
export const proposalTreeInclude = {
  products: {
    orderBy: { order: "asc" },
    include: {
      scenarios: {
        orderBy: { order: "asc" },
        include: {
          subscriptions: lineOrder,
          services: { ...lineOrder, include: { options: lineOrder } },
          maintenances: lineOrder,
          additionalOptions: lineOrder,
        },
      },
    },
  },
} satisfies Prisma.ProposalInclude;

export type ProposalTree = Prisma.ProposalGetPayload<{ include: typeof proposalTreeInclude }>;

export interface ProposalListFilter {
  q?: string;
  status?: ProposalStatus;
  entityId?: string;
  includeArchived?: boolean;
}

export function listProposals(filter: ProposalListFilter = {}) {
  const where: Prisma.ProposalWhereInput = {
    ...(filter.includeArchived ? {} : { archivedAt: null }),
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.entityId ? { entityId: filter.entityId } : {}),
    ...(filter.q
      ? {
          OR: [
            { number: { contains: filter.q, mode: "insensitive" } },
            { entity: { name: { contains: filter.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  return prisma.proposal.findMany({
    where,
    orderBy: [{ creationDate: "desc" }, { number: "desc" }],
    take: 200,
    include: { entity: { select: { id: true, name: true } }, ...proposalTreeInclude },
  });
}

export async function getProposal(id: string) {
  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: {
      entity: { select: { id: true, name: true } },
      rfpRfi: { select: { id: true, type: true, counter: true, title: true } },
      ...proposalTreeInclude,
    },
  });
  if (!proposal) throw new NotFoundError(t.common.notFound);
  return proposal;
}

// -----------------------------------------------------------------------------
// Proposition
// -----------------------------------------------------------------------------

/** Numéro lisible : P-2026-0001 (séquence par année de création). */
async function nextProposalNumber(tx: Tx, creationDate: Date): Promise<string> {
  const prefix = `P-${creationDate.getUTCFullYear()}-`;
  const last = await tx.proposal.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const lastSeq = last ? Number(last.number.slice(prefix.length)) || 0 : 0;
  return `${prefix}${String(lastSeq + 1).padStart(4, "0")}`;
}

const proposalColumns = (data: ProposalData) => ({
  creationDate: fromDateInput(data.creationDate),
  validityDate: data.validityDate ? fromDateInput(data.validityDate) : null,
  contractDuration: data.contractDuration,
  status: data.status,
  currency: data.currency,
  notes: data.notes,
  rfpRfiId: data.rfpRfiId,
});

async function checkedRfpId(tx: Tx, entityId: string, rfpRfiId: string | null) {
  if (!rfpRfiId) return null;
  const rfp = await tx.rfpRfi.findFirst({
    where: { id: rfpRfiId, entityId },
    select: { id: true },
  });
  return rfp?.id ?? null;
}

async function withNumberRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i >= 5 || !isUniqueViolation(error)) throw error;
    }
  }
}

export function createProposal(data: ProposalData, userId: string) {
  return withNumberRetry(() =>
    prisma.$transaction(async (tx) => {
      const columns = proposalColumns(data);
      const proposal = await tx.proposal.create({
        data: {
          ...columns,
          rfpRfiId: await checkedRfpId(tx, data.entityId, data.rfpRfiId),
          entityId: data.entityId,
          number: await nextProposalNumber(tx, columns.creationDate),
          createdById: userId,
          updatedById: userId,
        },
      });
      await recordAudit(
        { userId, objectType: "Proposal", objectId: proposal.id, action: "CREATE" },
        tx,
      );
      return proposal;
    }),
  );
}

/** L'entité d'une proposition n'est pas modifiable après création. */
export async function updateProposal(id: string, data: ProposalData, userId: string) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.proposal.findUniqueOrThrow({ where: { id } });
    const updated = await tx.proposal.update({
      where: { id },
      data: {
        ...proposalColumns(data),
        rfpRfiId: await checkedRfpId(tx, before.entityId, data.rfpRfiId),
        updatedById: userId,
      },
    });
    if (before.status !== updated.status) {
      await recordAudit(
        {
          userId,
          objectType: "Proposal",
          objectId: id,
          action: "STATUS",
          changes: { status: { from: before.status, to: updated.status } },
        },
        tx,
      );
    }
    return updated;
  });
}

export async function setProposalArchived(id: string, archived: boolean, userId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.proposal.update({
      where: { id },
      data: { archivedAt: archived ? new Date() : null, updatedById: userId },
    });
    await recordAudit(
      { userId, objectType: "Proposal", objectId: id, action: archived ? "ARCHIVE" : "UNARCHIVE" },
      tx,
    );
  });
}

/**
 * Duplique une proposition (nouvelle version de travail, statut Brouillon).
 * Tous les snapshots et prix sont recopiés tels quels : aucune relecture du catalogue.
 */
export async function duplicateProposal(id: string, userId: string, today: Date) {
  const source = await getProposal(id);
  return withNumberRetry(() =>
    prisma.$transaction(async (tx) => {
      const copy = await tx.proposal.create({
        data: {
          entityId: source.entityId,
          number: await nextProposalNumber(tx, today),
          creationDate: today,
          validityDate: source.validityDate,
          contractDuration: source.contractDuration,
          status: "DRAFT",
          currency: source.currency,
          notes: source.notes,
          rfpRfiId: source.rfpRfiId,
          createdById: userId,
          updatedById: userId,
          products: {
            create: source.products.map((pp) => ({
              productId: pp.productId,
              displayNameSnapshot: pp.displayNameSnapshot,
              displayDescriptionSnapshot: pp.displayDescriptionSnapshot,
              order: pp.order,
              notes: pp.notes,
              scenarios: {
                create: pp.scenarios.map((s) => ({
                  name: s.name,
                  description: s.description,
                  order: s.order,
                  subscriptions: { create: s.subscriptions.map(stripLine) },
                  services: {
                    create: s.services.map((svc) => ({
                      ...stripLine(svc),
                      options: { create: svc.options.map(stripOption) },
                    })),
                  },
                  maintenances: { create: s.maintenances.map(stripLine) },
                  additionalOptions: { create: s.additionalOptions.map(stripOption) },
                })),
              },
            })),
          },
        },
      });
      await recordAudit(
        {
          userId,
          objectType: "Proposal",
          objectId: copy.id,
          action: "DUPLICATE",
          changes: { from: id },
        },
        tx,
      );
      return copy;
    }),
  );
}

/** Copie d'une ligne sans ses identifiants techniques. */
function stripLine<
  T extends {
    codeSnapshot: string;
    descriptionSnapshot: string;
    listPrice: Prisma.Decimal;
    discount: Prisma.Decimal;
    customerPrice: Prisma.Decimal;
    displayDiscount: boolean;
    order: number;
  },
>(
  line: T &
    (
      | { subscriptionId: string | null }
      | { serviceId: string | null }
      | { maintenanceId: string | null }
    ),
) {
  const catalogRef =
    "subscriptionId" in line
      ? { subscriptionId: line.subscriptionId }
      : "serviceId" in line
        ? { serviceId: line.serviceId }
        : { maintenanceId: line.maintenanceId };
  return {
    ...catalogRef,
    codeSnapshot: line.codeSnapshot,
    descriptionSnapshot: line.descriptionSnapshot,
    listPrice: line.listPrice,
    discount: line.discount,
    customerPrice: line.customerPrice,
    displayDiscount: line.displayDiscount,
    order: line.order,
  };
}

function stripOption(o: {
  description: string;
  listPrice: Prisma.Decimal;
  discount: Prisma.Decimal;
  customerPrice: Prisma.Decimal;
  displayDiscount: boolean;
  order: number;
}) {
  return {
    description: o.description,
    listPrice: o.listPrice,
    discount: o.discount,
    customerPrice: o.customerPrice,
    displayDiscount: o.displayDiscount,
    order: o.order,
  };
}

// -----------------------------------------------------------------------------
// Verrouillage
// -----------------------------------------------------------------------------

/** Refuse toute modification du contenu d'une proposition figée ou archivée. */
export async function assertProposalEditable(proposalId: string, tx: Tx = prisma) {
  const p = await tx.proposal.findUnique({
    where: { id: proposalId },
    select: { status: true, archivedAt: true },
  });
  if (!p) throw new NotFoundError(t.common.notFound);
  if (p.archivedAt || LOCKED_PROPOSAL_STATUSES.includes(p.status))
    throw new DomainError(t.proposal.locked);
}

async function touch(tx: Tx, proposalId: string, userId: string) {
  await tx.proposal.update({
    where: { id: proposalId },
    data: { updatedById: userId, updatedAt: new Date() },
  });
}

async function proposalIdOfProduct(tx: Tx, proposalProductId: string) {
  const pp = await tx.proposalProduct.findUnique({
    where: { id: proposalProductId },
    select: { proposalId: true },
  });
  if (!pp) throw new NotFoundError(t.common.notFound);
  return pp.proposalId;
}

async function proposalIdOfScenario(tx: Tx, scenarioId: string) {
  const s = await tx.scenario.findUnique({
    where: { id: scenarioId },
    select: { proposalProduct: { select: { proposalId: true } } },
  });
  if (!s) throw new NotFoundError(t.common.notFound);
  return s.proposalProduct.proposalId;
}

/** Ouvre une transaction après avoir vérifié que la proposition est modifiable. */
async function editProposal<T>(
  resolveProposalId: (tx: Tx) => Promise<string>,
  userId: string,
  fn: (tx: Tx, proposalId: string) => Promise<T>,
): Promise<{ proposalId: string; result: T }> {
  return prisma.$transaction(async (tx) => {
    const proposalId = await resolveProposalId(tx);
    await assertProposalEditable(proposalId, tx);
    const result = await fn(tx, proposalId);
    await touch(tx, proposalId, userId);
    return { proposalId, result };
  });
}

// -----------------------------------------------------------------------------
// Produits & scénarios
// -----------------------------------------------------------------------------

/** Ajoute un produit du catalogue (snapshot nom + description) avec un scénario par défaut. */
export function addProductToProposal(proposalId: string, productId: string, userId: string) {
  return editProposal(
    async () => proposalId,
    userId,
    async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product || !product.active) throw new NotFoundError(t.common.notFound);
      const max = await tx.proposalProduct.aggregate({
        where: { proposalId },
        _max: { order: true },
      });
      return tx.proposalProduct.create({
        data: {
          proposalId,
          productId,
          displayNameSnapshot: product.name,
          displayDescriptionSnapshot: product.description,
          order: (max._max.order ?? -1) + 1,
          scenarios: { create: { name: t.proposal.defaultScenarioName, order: 0 } },
        },
        include: { scenarios: true },
      });
    },
  );
}

export function removeProposalProduct(proposalProductId: string, userId: string) {
  return editProposal(
    (tx) => proposalIdOfProduct(tx, proposalProductId),
    userId,
    (tx) => tx.proposalProduct.delete({ where: { id: proposalProductId } }),
  );
}

export function addScenario(proposalProductId: string, data: ScenarioData, userId: string) {
  return editProposal(
    (tx) => proposalIdOfProduct(tx, proposalProductId),
    userId,
    async (tx) => {
      const max = await tx.scenario.aggregate({
        where: { proposalProductId },
        _max: { order: true },
      });
      return tx.scenario.create({
        data: { ...data, proposalProductId, order: (max._max.order ?? -1) + 1 },
      });
    },
  );
}

export function updateScenario(scenarioId: string, data: ScenarioData, userId: string) {
  return editProposal(
    (tx) => proposalIdOfScenario(tx, scenarioId),
    userId,
    (tx) => tx.scenario.update({ where: { id: scenarioId }, data }),
  );
}

/** Un produit garde toujours au moins un scénario. */
export function deleteScenario(scenarioId: string, userId: string) {
  return editProposal(
    (tx) => proposalIdOfScenario(tx, scenarioId),
    userId,
    async (tx) => {
      const scenario = await tx.scenario.findUniqueOrThrow({ where: { id: scenarioId } });
      const siblings = await tx.scenario.count({
        where: { proposalProductId: scenario.proposalProductId },
      });
      if (siblings <= 1) throw new DomainError(t.proposal.lastScenario);
      return tx.scenario.delete({ where: { id: scenarioId } });
    },
  );
}

export function setSelectedCombination(scenarioId: string, key: string | null, userId: string) {
  return editProposal(
    (tx) => proposalIdOfScenario(tx, scenarioId),
    userId,
    (tx) =>
      tx.scenario.update({ where: { id: scenarioId }, data: { selectedCombinationKey: key } }),
  );
}

// -----------------------------------------------------------------------------
// Lignes de scénario
// -----------------------------------------------------------------------------

export type CatalogLineKind = "subscription" | "service" | "maintenance";
export type OptionLineKind = "serviceOption" | "additionalOption";

const price = (listPrice: string, discount: string) => ({
  listPrice,
  discount,
  customerPrice: computeCustomerPrice(listPrice, discount).toFixed(2),
});

/** Snapshot du catalogue : code, libellé et prix sont LUS EN BASE, pas fournis par le client. */
async function catalogSnapshot(tx: Tx, kind: CatalogLineKind, catalogId: string) {
  switch (kind) {
    case "subscription": {
      const s = await tx.subscription.findUnique({ where: { id: catalogId } });
      return (
        s && { code: s.code, description: s.description, listPrice: s.listPriceAnnual.toFixed(2) }
      );
    }
    case "service": {
      const s = await tx.service.findUnique({ where: { id: catalogId } });
      return s && { code: s.code, description: s.description, listPrice: s.listPrice.toFixed(2) };
    }
    case "maintenance": {
      const s = await tx.maintenance.findUnique({ where: { id: catalogId } });
      return s && { code: s.code, description: s.description, listPrice: s.listPrice.toFixed(2) };
    }
  }
}

async function nextLineOrder(
  tx: Tx,
  kind: CatalogLineKind | "additionalOption",
  scenarioId: string,
) {
  const where = { scenarioId };
  const agg =
    kind === "subscription"
      ? await tx.scenarioSubscription.aggregate({ where, _max: { order: true } })
      : kind === "service"
        ? await tx.scenarioService.aggregate({ where, _max: { order: true } })
        : kind === "maintenance"
          ? await tx.scenarioMaintenance.aggregate({ where, _max: { order: true } })
          : await tx.scenarioOption.aggregate({ where, _max: { order: true } });
  return (agg._max.order ?? -1) + 1;
}

export function addCatalogLine(
  kind: CatalogLineKind,
  scenarioId: string,
  data: CatalogLineData,
  userId: string,
) {
  return editProposal(
    (tx) => proposalIdOfScenario(tx, scenarioId),
    userId,
    async (tx) => {
      let snapshot = { code: data.code, description: data.description, listPrice: data.listPrice };
      if (data.catalogId) {
        const fromCatalog = await catalogSnapshot(tx, kind, data.catalogId);
        if (!fromCatalog) throw new NotFoundError(t.common.notFound);
        // Le libellé peut être reformulé pour le client ; code et prix catalogue sont figés.
        snapshot = { ...fromCatalog, description: data.description || fromCatalog.description };
      }
      const values = {
        scenarioId,
        codeSnapshot: snapshot.code,
        descriptionSnapshot: snapshot.description,
        displayDiscount: data.displayDiscount,
        order: await nextLineOrder(tx, kind, scenarioId),
        ...price(snapshot.listPrice, data.discount),
      };
      switch (kind) {
        case "subscription":
          return tx.scenarioSubscription.create({
            data: { ...values, subscriptionId: data.catalogId },
          });
        case "service":
          return tx.scenarioService.create({ data: { ...values, serviceId: data.catalogId } });
        case "maintenance":
          return tx.scenarioMaintenance.create({
            data: { ...values, maintenanceId: data.catalogId },
          });
      }
    },
  );
}

async function proposalIdOfCatalogLine(tx: Tx, kind: CatalogLineKind, id: string) {
  const select = { scenarioId: true } as const;
  const line =
    kind === "subscription"
      ? await tx.scenarioSubscription.findUnique({ where: { id }, select })
      : kind === "service"
        ? await tx.scenarioService.findUnique({ where: { id }, select })
        : await tx.scenarioMaintenance.findUnique({ where: { id }, select });
  if (!line) throw new NotFoundError(t.common.notFound);
  return proposalIdOfScenario(tx, line.scenarioId);
}

/**
 * Mise à jour d'une ligne. Pour une ligne issue du catalogue, le code et le prix
 * catalogue (snapshot) ne sont pas modifiables : seuls libellé, remise et affichage le sont.
 */
export function updateCatalogLine(
  kind: CatalogLineKind,
  id: string,
  data: CatalogLineData,
  userId: string,
) {
  return editProposal(
    (tx) => proposalIdOfCatalogLine(tx, kind, id),
    userId,
    async (tx) => {
      const current =
        kind === "subscription"
          ? await tx.scenarioSubscription.findUniqueOrThrow({ where: { id } })
          : kind === "service"
            ? await tx.scenarioService.findUniqueOrThrow({ where: { id } })
            : await tx.scenarioMaintenance.findUniqueOrThrow({ where: { id } });
      const catalogId =
        "subscriptionId" in current
          ? current.subscriptionId
          : "serviceId" in current
            ? current.serviceId
            : current.maintenanceId;
      const frozen = catalogId !== null;
      const listPrice = frozen ? current.listPrice.toFixed(2) : data.listPrice;
      const values = {
        codeSnapshot: frozen ? current.codeSnapshot : data.code,
        descriptionSnapshot: data.description,
        displayDiscount: data.displayDiscount,
        ...price(listPrice, data.discount),
      };
      switch (kind) {
        case "subscription":
          return tx.scenarioSubscription.update({ where: { id }, data: values });
        case "service":
          return tx.scenarioService.update({ where: { id }, data: values });
        case "maintenance":
          return tx.scenarioMaintenance.update({ where: { id }, data: values });
      }
    },
  );
}

export function deleteCatalogLine(kind: CatalogLineKind, id: string, userId: string) {
  return editProposal(
    (tx) => proposalIdOfCatalogLine(tx, kind, id),
    userId,
    async (tx) => {
      switch (kind) {
        case "subscription":
          return tx.scenarioSubscription.delete({ where: { id } });
        case "service":
          return tx.scenarioService.delete({ where: { id } });
        case "maintenance":
          return tx.scenarioMaintenance.delete({ where: { id } });
      }
    },
  );
}

/** parentId = scenarioServiceId (option de service) ou scenarioId (option additionnelle). */
export function addOptionLine(
  kind: OptionLineKind,
  parentId: string,
  data: OptionLineData,
  userId: string,
) {
  return editProposal(
    async (tx) => {
      if (kind === "additionalOption") return proposalIdOfScenario(tx, parentId);
      const svc = await tx.scenarioService.findUnique({
        where: { id: parentId },
        select: { scenarioId: true },
      });
      if (!svc) throw new NotFoundError(t.common.notFound);
      return proposalIdOfScenario(tx, svc.scenarioId);
    },
    userId,
    async (tx) => {
      const values = {
        description: data.description,
        displayDiscount: data.displayDiscount,
        ...price(data.listPrice, data.discount),
      };
      if (kind === "additionalOption") {
        return tx.scenarioOption.create({
          data: { ...values, scenarioId: parentId, order: await nextLineOrder(tx, kind, parentId) },
        });
      }
      const max = await tx.scenarioServiceOption.aggregate({
        where: { scenarioServiceId: parentId },
        _max: { order: true },
      });
      return tx.scenarioServiceOption.create({
        data: { ...values, scenarioServiceId: parentId, order: (max._max.order ?? -1) + 1 },
      });
    },
  );
}

async function proposalIdOfOptionLine(tx: Tx, kind: OptionLineKind, id: string) {
  if (kind === "additionalOption") {
    const o = await tx.scenarioOption.findUnique({ where: { id }, select: { scenarioId: true } });
    if (!o) throw new NotFoundError(t.common.notFound);
    return proposalIdOfScenario(tx, o.scenarioId);
  }
  const o = await tx.scenarioServiceOption.findUnique({
    where: { id },
    select: { scenarioService: { select: { scenarioId: true } } },
  });
  if (!o) throw new NotFoundError(t.common.notFound);
  return proposalIdOfScenario(tx, o.scenarioService.scenarioId);
}

export function updateOptionLine(
  kind: OptionLineKind,
  id: string,
  data: OptionLineData,
  userId: string,
) {
  return editProposal(
    (tx) => proposalIdOfOptionLine(tx, kind, id),
    userId,
    async (tx) => {
      const values = {
        description: data.description,
        displayDiscount: data.displayDiscount,
        ...price(data.listPrice, data.discount),
      };
      return kind === "additionalOption"
        ? tx.scenarioOption.update({ where: { id }, data: values })
        : tx.scenarioServiceOption.update({ where: { id }, data: values });
    },
  );
}

export function deleteOptionLine(kind: OptionLineKind, id: string, userId: string) {
  return editProposal(
    (tx) => proposalIdOfOptionLine(tx, kind, id),
    userId,
    async (tx) =>
      kind === "additionalOption"
        ? tx.scenarioOption.delete({ where: { id } })
        : tx.scenarioServiceOption.delete({ where: { id } }),
  );
}
