import "server-only";
import type { Prisma } from "@prisma/client";
import { fromDateTimeInput } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { DemoData } from "@/lib/validation/crm";
import { config } from "../config";
import { prisma } from "../db";
import { NotFoundError } from "../errors";
import { nextCounter, withCounterRetry } from "./counters";

export interface DemoListFilter {
  q?: string;
  entityId?: string;
  targetId?: string;
}

export function listDemos(filter: DemoListFilter = {}) {
  const where: Prisma.DemoWhereInput = {
    ...(filter.entityId ? { entityId: filter.entityId } : {}),
    ...(filter.targetId ? { targets: { some: { demoTargetId: filter.targetId } } } : {}),
    ...(filter.q
      ? {
          OR: [
            { title: { contains: filter.q, mode: "insensitive" } },
            { entity: { name: { contains: filter.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  return prisma.demo.findMany({
    where,
    orderBy: { demoDate: "desc" },
    take: 300,
    include: {
      entity: { select: { id: true, name: true } },
      targets: { include: { demoTarget: true } },
      tags: { include: { tag: true } },
    },
  });
}

export async function getDemo(id: string) {
  const demo = await prisma.demo.findUnique({
    where: { id },
    include: {
      entity: { select: { id: true, name: true } },
      meeting: { select: { id: true, counter: true, title: true } },
      targets: { include: { demoTarget: true } },
      tags: { include: { tag: true } },
    },
  });
  if (!demo) throw new NotFoundError(t.common.notFound);
  return demo;
}

/** Le meeting lié doit appartenir à la même entité. */
async function checkedMeetingId(
  tx: Prisma.TransactionClient,
  entityId: string,
  meetingId: string | null,
) {
  if (!meetingId) return null;
  const found = await tx.meeting.findFirst({
    where: { id: meetingId, entityId },
    select: { id: true },
  });
  return found?.id ?? null;
}

const demoColumns = (data: DemoData) => ({
  title: data.title,
  demoDate: fromDateTimeInput(data.demoDate, config().APP_TIMEZONE),
  notes: data.notes,
  transcript: data.transcript,
  nextSteps: data.nextSteps,
});

export function createDemo(data: DemoData, userId: string) {
  return withCounterRetry(() =>
    prisma.$transaction(async (tx) => {
      const counter = nextCounter(
        await tx.demo.aggregate({ where: { entityId: data.entityId }, _max: { counter: true } }),
      );
      return tx.demo.create({
        data: {
          ...demoColumns(data),
          meetingId: await checkedMeetingId(tx, data.entityId, data.meetingId),
          entityId: data.entityId,
          counter,
          createdById: userId,
          updatedById: userId,
          targets: { create: data.targetIds.map((demoTargetId) => ({ demoTargetId })) },
          tags: { create: data.tagIds.map((tagId) => ({ tagId })) },
        },
      });
    }),
  );
}

export function updateDemo(id: string, data: DemoData, userId: string) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.demo.findUniqueOrThrow({ where: { id }, select: { entityId: true } });
    const meetingId = await checkedMeetingId(tx, current.entityId, data.meetingId);
    await tx.demoDemoTarget.deleteMany({ where: { demoId: id } });
    await tx.demoTag.deleteMany({ where: { demoId: id } });
    return tx.demo.update({
      where: { id },
      data: {
        ...demoColumns(data),
        meetingId,
        updatedById: userId,
        targets: { create: data.targetIds.map((demoTargetId) => ({ demoTargetId })) },
        tags: { create: data.tagIds.map((tagId) => ({ tagId })) },
      },
    });
  });
}

export function deleteDemo(id: string) {
  return prisma.demo.delete({ where: { id } });
}
