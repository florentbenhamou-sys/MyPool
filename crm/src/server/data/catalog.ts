import "server-only";
import type { PriceItemData, ProductData } from "@/lib/validation/catalog";
import { prisma } from "../db";

/**
 * Catalogue : valeurs ACTUELLES. Les éléments ne sont jamais supprimés
 * (ils peuvent être référencés par des propositions) : on les désactive.
 */

export type PriceCatalogKind = "subscription" | "service" | "maintenance";

export interface PriceCatalogItem {
  id: string;
  code: string;
  description: string;
  listPrice: string;
  currency: string;
  active: boolean;
  usageCount: number;
}

// --- Produits ---

export function listProducts(includeInactive = true) {
  return prisma.product.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { _count: { select: { proposalProducts: true } } },
  });
}

export function createProduct(data: ProductData) {
  return prisma.product.create({ data });
}

export function updateProduct(id: string, data: ProductData) {
  return prisma.product.update({ where: { id }, data });
}

export function setProductActive(id: string, active: boolean) {
  return prisma.product.update({ where: { id }, data: { active } });
}

// --- Souscriptions / services / maintenances ---

export async function listPriceCatalog(
  kind: PriceCatalogKind,
  includeInactive = true,
): Promise<PriceCatalogItem[]> {
  const where = includeInactive ? {} : { active: true };
  const orderBy = [{ active: "desc" as const }, { code: "asc" as const }];
  switch (kind) {
    case "subscription": {
      const rows = await prisma.subscription.findMany({
        where,
        orderBy,
        include: { _count: { select: { scenarioLines: true } } },
      });
      return rows.map((r) => ({
        id: r.id,
        code: r.code,
        description: r.description,
        listPrice: r.listPriceAnnual.toFixed(2),
        currency: r.currency,
        active: r.active,
        usageCount: r._count.scenarioLines,
      }));
    }
    case "service": {
      const rows = await prisma.service.findMany({
        where,
        orderBy,
        include: { _count: { select: { scenarioLines: true } } },
      });
      return rows.map((r) => ({
        id: r.id,
        code: r.code,
        description: r.description,
        listPrice: r.listPrice.toFixed(2),
        currency: r.currency,
        active: r.active,
        usageCount: r._count.scenarioLines,
      }));
    }
    case "maintenance": {
      const rows = await prisma.maintenance.findMany({
        where,
        orderBy,
        include: { _count: { select: { scenarioLines: true } } },
      });
      return rows.map((r) => ({
        id: r.id,
        code: r.code,
        description: r.description,
        listPrice: r.listPrice.toFixed(2),
        currency: r.currency,
        active: r.active,
        usageCount: r._count.scenarioLines,
      }));
    }
  }
}

export async function savePriceCatalogItem(
  kind: PriceCatalogKind,
  id: string | null,
  data: PriceItemData,
) {
  const { listPrice, ...rest } = data;
  switch (kind) {
    case "subscription": {
      const values = { ...rest, listPriceAnnual: listPrice };
      return id
        ? prisma.subscription.update({ where: { id }, data: values })
        : prisma.subscription.create({ data: values });
    }
    case "service": {
      const values = { ...rest, listPrice };
      return id
        ? prisma.service.update({ where: { id }, data: values })
        : prisma.service.create({ data: values });
    }
    case "maintenance": {
      const values = { ...rest, listPrice };
      return id
        ? prisma.maintenance.update({ where: { id }, data: values })
        : prisma.maintenance.create({ data: values });
    }
  }
}

export async function setPriceCatalogItemActive(
  kind: PriceCatalogKind,
  id: string,
  active: boolean,
) {
  switch (kind) {
    case "subscription":
      return prisma.subscription.update({ where: { id }, data: { active } });
    case "service":
      return prisma.service.update({ where: { id }, data: { active } });
    case "maintenance":
      return prisma.maintenance.update({ where: { id }, data: { active } });
  }
}

/** Lecture d'un élément de catalogue au moment de l'ajout dans une proposition (snapshot). */
export async function getPriceCatalogItem(kind: PriceCatalogKind, id: string) {
  const items = await listPriceCatalog(kind);
  return items.find((i) => i.id === id) ?? null;
}
