import "server-only";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { fromDateInput } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { RfpRfiData } from "@/lib/validation/crm";
import { prisma } from "../db";
import { NotFoundError } from "../errors";
import { getStorage } from "../storage";
import { nextCounter, withCounterRetry } from "./counters";

export interface RfpListFilter {
  q?: string;
  entityId?: string;
  open?: boolean;
}

/** « En cours » = pas encore de date de réponse, ou date de réponse à venir. */
export function openRfpWhere(today: Date): Prisma.RfpRfiWhereInput {
  return { OR: [{ responseDate: null }, { responseDate: { gte: today } }] };
}

export function listRfps(filter: RfpListFilter = {}, today = new Date()) {
  const where: Prisma.RfpRfiWhereInput = {
    AND: [
      filter.entityId ? { entityId: filter.entityId } : {},
      filter.open ? openRfpWhere(today) : {},
      filter.q
        ? {
            OR: [
              { title: { contains: filter.q, mode: "insensitive" } },
              { entity: { name: { contains: filter.q, mode: "insensitive" } } },
            ],
          }
        : {},
    ],
  };
  return prisma.rfpRfi.findMany({
    where,
    orderBy: { contactDate: "desc" },
    take: 300,
    include: { entity: { select: { id: true, name: true } }, _count: { select: { files: true } } },
  });
}

export async function getRfp(id: string) {
  const rfp = await prisma.rfpRfi.findUnique({
    where: { id },
    include: {
      entity: { select: { id: true, name: true } },
      files: { orderBy: { createdAt: "desc" } },
      proposals: { select: { id: true, number: true, status: true } },
    },
  });
  if (!rfp) throw new NotFoundError(t.common.notFound);
  return rfp;
}

export function listRfpOptions(entityId: string) {
  return prisma.rfpRfi.findMany({
    where: { entityId },
    orderBy: { contactDate: "desc" },
    select: { id: true, type: true, counter: true, title: true },
  });
}

const rfpColumns = (data: RfpRfiData) => ({
  type: data.type,
  title: data.title,
  contactDate: fromDateInput(data.contactDate),
  responseDate: data.responseDate ? fromDateInput(data.responseDate) : null,
  presentationDate: data.presentationDate ? fromDateInput(data.presentationDate) : null,
  notes: data.notes,
});

export function createRfp(data: RfpRfiData, userId: string) {
  return withCounterRetry(() =>
    prisma.$transaction(async (tx) => {
      const counter = nextCounter(
        await tx.rfpRfi.aggregate({ where: { entityId: data.entityId }, _max: { counter: true } }),
      );
      return tx.rfpRfi.create({
        data: {
          ...rfpColumns(data),
          entityId: data.entityId,
          counter,
          createdById: userId,
          updatedById: userId,
        },
      });
    }),
  );
}

export function updateRfp(id: string, data: RfpRfiData, userId: string) {
  return prisma.rfpRfi.update({
    where: { id },
    data: { ...rfpColumns(data), updatedById: userId },
  });
}

export async function deleteRfp(id: string) {
  const files = await prisma.rfpRfiFile.findMany({
    where: { rfpRfiId: id },
    select: { storageKey: true },
  });
  await prisma.rfpRfi.delete({ where: { id } });
  await Promise.all(files.map((f) => getStorage().delete(f.storageKey)));
}

// --- Fichiers ---

export async function addRfpFile(
  rfpRfiId: string,
  file: { fileName: string; mimeType: string; bytes: Uint8Array },
  userId: string,
) {
  await prisma.rfpRfi.findUniqueOrThrow({ where: { id: rfpRfiId }, select: { id: true } });
  const storageKey = `rfp/${rfpRfiId}/${randomUUID()}`;
  await getStorage().put(storageKey, file.bytes, file.mimeType);
  try {
    return await prisma.rfpRfiFile.create({
      data: {
        rfpRfiId,
        fileName: file.fileName,
        mimeType: file.mimeType,
        sizeBytes: file.bytes.byteLength,
        storageKey,
        createdById: userId,
      },
    });
  } catch (error) {
    await getStorage().delete(storageKey);
    throw error;
  }
}

export function getRfpFile(id: string) {
  return prisma.rfpRfiFile.findUnique({ where: { id } });
}

export async function deleteRfpFile(id: string) {
  const file = await prisma.rfpRfiFile.delete({ where: { id } });
  await getStorage().delete(file.storageKey);
  return file;
}
