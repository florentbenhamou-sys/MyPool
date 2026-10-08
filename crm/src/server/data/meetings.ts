import "server-only";
import type { Prisma } from "@prisma/client";
import { fromDateTimeInput } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { MeetingData } from "@/lib/validation/crm";
import { config } from "../config";
import { prisma } from "../db";
import { NotFoundError } from "../errors";
import { nextCounter, withCounterRetry } from "./counters";

export interface MeetingListFilter {
  q?: string;
  entityId?: string;
  when?: "upcoming" | "past";
}

export function listMeetings(filter: MeetingListFilter = {}) {
  const now = new Date();
  const where: Prisma.MeetingWhereInput = {
    ...(filter.entityId ? { entityId: filter.entityId } : {}),
    ...(filter.when === "upcoming" ? { meetingDate: { gte: now } } : {}),
    ...(filter.when === "past" ? { meetingDate: { lt: now } } : {}),
    ...(filter.q
      ? {
          OR: [
            { title: { contains: filter.q, mode: "insensitive" } },
            { entity: { name: { contains: filter.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  return prisma.meeting.findMany({
    where,
    orderBy: { meetingDate: filter.when === "upcoming" ? "asc" : "desc" },
    take: 300,
    include: {
      entity: { select: { id: true, name: true } },
      tags: { include: { tag: true } },
      _count: { select: { contacts: true } },
    },
  });
}

export async function getMeeting(id: string) {
  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: {
      entity: { select: { id: true, name: true } },
      demoTarget: true,
      contacts: { include: { contact: true } },
      tags: { include: { tag: true } },
      demos: { select: { id: true, counter: true, title: true, demoDate: true } },
    },
  });
  if (!meeting) throw new NotFoundError(t.common.notFound);
  return meeting;
}

/** Liste courte pour lier une démo à un meeting de la même entité. */
export function listMeetingOptions(entityId: string) {
  return prisma.meeting.findMany({
    where: { entityId },
    orderBy: { meetingDate: "desc" },
    select: { id: true, counter: true, title: true, meetingDate: true },
  });
}

const meetingColumns = (data: MeetingData) => ({
  type: data.type,
  title: data.title,
  meetingDate: fromDateTimeInput(data.meetingDate, config().APP_TIMEZONE),
  demoTargetId: data.demoTargetId,
  notes: data.notes,
  transcript: data.transcript,
  nextSteps: data.nextSteps,
});

/** Ne garde que les contacts appartenant bien à l'entité (ne jamais faire confiance au client). */
async function entityContactIds(tx: Prisma.TransactionClient, entityId: string, ids: string[]) {
  if (ids.length === 0) return [];
  const rows = await tx.contact.findMany({
    where: { entityId, id: { in: ids } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

export function createMeeting(data: MeetingData, userId: string) {
  return withCounterRetry(() =>
    prisma.$transaction(async (tx) => {
      const contactIds = await entityContactIds(tx, data.entityId, data.contactIds);
      const counter = nextCounter(
        await tx.meeting.aggregate({ where: { entityId: data.entityId }, _max: { counter: true } }),
      );
      return tx.meeting.create({
        data: {
          ...meetingColumns(data),
          entityId: data.entityId,
          counter,
          createdById: userId,
          updatedById: userId,
          contacts: { create: contactIds.map((contactId) => ({ contactId })) },
          tags: { create: data.tagIds.map((tagId) => ({ tagId })) },
        },
      });
    }),
  );
}

/** L'entité d'un meeting n'est pas modifiable (son compteur en dépend). */
export function updateMeeting(id: string, data: MeetingData, userId: string) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.meeting.findUniqueOrThrow({
      where: { id },
      select: { entityId: true },
    });
    const contactIds = await entityContactIds(tx, current.entityId, data.contactIds);
    await tx.meetingContact.deleteMany({ where: { meetingId: id } });
    await tx.meetingTag.deleteMany({ where: { meetingId: id } });
    return tx.meeting.update({
      where: { id },
      data: {
        ...meetingColumns(data),
        updatedById: userId,
        contacts: { create: contactIds.map((contactId) => ({ contactId })) },
        tags: { create: data.tagIds.map((tagId) => ({ tagId })) },
      },
    });
  });
}

export function deleteMeeting(id: string) {
  return prisma.meeting.delete({ where: { id } });
}
