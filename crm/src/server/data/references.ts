import "server-only";
import type { ReferenceData, TagData } from "@/lib/validation/catalog";
import { prisma } from "../db";

/** Référentiels administrables. Jamais supprimés : désactivés (active = false). */

export function listTags(includeInactive = false) {
  return prisma.tag.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: [{ category: "asc" }, { order: "asc" }, { label: "asc" }],
  });
}

export function saveTag(id: string | null, data: TagData) {
  return id ? prisma.tag.update({ where: { id }, data }) : prisma.tag.create({ data });
}

export function setTagActive(id: string, active: boolean) {
  return prisma.tag.update({ where: { id }, data: { active } });
}

export type ReferenceKind = "channelType" | "demoTarget";

export function listReferences(kind: ReferenceKind, includeInactive = false) {
  const args = {
    where: includeInactive ? {} : { active: true },
    orderBy: [{ order: "asc" as const }, { label: "asc" as const }],
  };
  return kind === "channelType"
    ? prisma.contactChannelType.findMany(args)
    : prisma.demoTarget.findMany(args);
}

export function saveReference(kind: ReferenceKind, id: string | null, data: ReferenceData) {
  if (kind === "channelType") {
    return id
      ? prisma.contactChannelType.update({ where: { id }, data })
      : prisma.contactChannelType.create({ data });
  }
  return id
    ? prisma.demoTarget.update({ where: { id }, data })
    : prisma.demoTarget.create({ data });
}

export function setReferenceActive(kind: ReferenceKind, id: string, active: boolean) {
  return kind === "channelType"
    ? prisma.contactChannelType.update({ where: { id }, data: { active } })
    : prisma.demoTarget.update({ where: { id }, data: { active } });
}
