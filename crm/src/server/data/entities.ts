import "server-only";
import type { EntityStatus, Prisma } from "@prisma/client";
import { fromDateInput } from "@/lib/format";
import type { EntityData, QuickEntityData } from "@/lib/validation/crm";
import { prisma } from "../db";
import { DomainError, NotFoundError } from "../errors";
import { t } from "@/lib/i18n";
import { recordAudit } from "./audit";

export type EntitySort = "name" | "updated" | "created";

export interface EntityListFilter {
  q?: string;
  status?: EntityStatus;
  sort?: EntitySort;
  includeArchived?: boolean;
}

export function listEntities(filter: EntityListFilter = {}) {
  const where: Prisma.EntityWhereInput = {
    ...(filter.includeArchived ? {} : { archivedAt: null }),
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.q
      ? {
          OR: [
            { name: { contains: filter.q, mode: "insensitive" } },
            { city: { contains: filter.q, mode: "insensitive" } },
            {
              contacts: {
                some: {
                  OR: [
                    { lastName: { contains: filter.q, mode: "insensitive" } },
                    { email: { contains: filter.q, mode: "insensitive" } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.EntityOrderByWithRelationInput =
    filter.sort === "updated"
      ? { updatedAt: "desc" }
      : filter.sort === "created"
        ? { createdAt: "desc" }
        : { name: "asc" };
  return prisma.entity.findMany({
    where,
    orderBy,
    take: 500,
    include: {
      _count: { select: { contacts: true, proposals: true, meetings: true } },
      tags: { include: { tag: true } },
    },
  });
}

/** Liste courte pour les sélecteurs. */
export function listEntityOptions() {
  return prisma.entity.findMany({
    where: { archivedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, status: true },
  });
}

export async function getEntity(id: string) {
  const entity = await prisma.entity.findUnique({
    where: { id },
    include: {
      tags: { include: { tag: true } },
      contacts: { orderBy: [{ active: "desc" }, { lastName: "asc" }] },
      contactChannels: {
        orderBy: { contactDate: "desc" },
        include: { type: true, contact: { select: { id: true, firstName: true, lastName: true } } },
      },
      meetings: { orderBy: { meetingDate: "desc" }, include: { demoTarget: true } },
      demos: {
        orderBy: { demoDate: "desc" },
        include: { targets: { include: { demoTarget: true } } },
      },
      rfpRfis: {
        orderBy: { contactDate: "desc" },
        include: { _count: { select: { files: true } } },
      },
      proposals: { orderBy: { creationDate: "desc" } },
    },
  });
  if (!entity) throw new NotFoundError(t.common.notFound);
  return entity;
}

const entityColumns = (data: EntityData) => ({
  name: data.name,
  status: data.status,
  communicationLanguage: data.communicationLanguage,
  website: data.website,
  addressLine1: data.addressLine1,
  addressLine2: data.addressLine2,
  postalCode: data.postalCode,
  city: data.city,
  country: data.country,
  notes: data.notes,
});

export async function createEntity(data: EntityData, userId: string) {
  return prisma.$transaction(async (tx) => {
    const entity = await tx.entity.create({
      data: {
        ...entityColumns(data),
        createdById: userId,
        updatedById: userId,
        tags: { create: data.tagIds.map((tagId) => ({ tagId })) },
      },
    });
    await recordAudit({ userId, objectType: "Entity", objectId: entity.id, action: "CREATE" }, tx);
    return entity;
  });
}

export async function updateEntity(id: string, data: EntityData, userId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.entityTag.deleteMany({ where: { entityId: id } });
    return tx.entity.update({
      where: { id },
      data: {
        ...entityColumns(data),
        updatedById: userId,
        tags: { create: data.tagIds.map((tagId) => ({ tagId })) },
      },
    });
  });
}

/** Saisie rapide : entité + contact + vecteur de prise de contact, tout ou rien. */
export async function quickCreateEntity(data: QuickEntityData, userId: string) {
  return prisma.$transaction(async (tx) => {
    const entity = await tx.entity.create({
      data: {
        name: data.name,
        status: data.status,
        notes: data.notes,
        createdById: userId,
        updatedById: userId,
      },
    });
    let contactId: string | null = null;
    if (data.contactEmail && data.contactFirstName && data.contactLastName) {
      const contact = await tx.contact.create({
        data: {
          entityId: entity.id,
          firstName: data.contactFirstName,
          lastName: data.contactLastName,
          email: data.contactEmail.toLowerCase(),
          phone: data.contactPhone,
          role: data.contactRole,
          createdById: userId,
          updatedById: userId,
        },
      });
      contactId = contact.id;
    }
    if (data.channelTypeId) {
      await tx.contactChannel.create({
        data: {
          entityId: entity.id,
          typeId: data.channelTypeId,
          contactId,
          eventName: data.eventName,
          contactDate: fromDateInput(data.contactDate),
          createdById: userId,
          updatedById: userId,
        },
      });
    }
    await recordAudit({ userId, objectType: "Entity", objectId: entity.id, action: "CREATE" }, tx);
    return entity;
  });
}

export async function deleteEntity(id: string, userId: string) {
  const proposals = await prisma.proposal.count({ where: { entityId: id } });
  if (proposals > 0) throw new DomainError(t.entity.hasProposals);
  await prisma.$transaction(async (tx) => {
    await tx.entity.delete({ where: { id } });
    await recordAudit({ userId, objectType: "Entity", objectId: id, action: "DELETE" }, tx);
  });
}

export async function setEntityArchived(id: string, archived: boolean, userId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.entity.update({
      where: { id },
      data: { archivedAt: archived ? new Date() : null, updatedById: userId },
    });
    await recordAudit(
      { userId, objectType: "Entity", objectId: id, action: archived ? "ARCHIVE" : "UNARCHIVE" },
      tx,
    );
  });
}
