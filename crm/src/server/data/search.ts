import "server-only";
import { prisma } from "../db";

/** Recherche globale simple (ILIKE). Pourra évoluer vers la recherche plein texte PostgreSQL. */
export async function globalSearch(q: string, take = 10) {
  const contains = { contains: q, mode: "insensitive" as const };
  const [entities, contacts, proposals, meetings, demos, rfps] = await Promise.all([
    prisma.entity.findMany({
      where: { OR: [{ name: contains }, { city: contains }, { website: contains }] },
      take,
      orderBy: { name: "asc" },
      select: { id: true, name: true, status: true, city: true, archivedAt: true },
    }),
    prisma.contact.findMany({
      where: {
        OR: [
          { firstName: contains },
          { lastName: contains },
          { email: contains },
          { phone: contains },
        ],
      },
      take,
      orderBy: { lastName: "asc" },
      include: { entity: { select: { id: true, name: true } } },
    }),
    prisma.proposal.findMany({
      where: { OR: [{ number: contains }, { notes: contains }, { entity: { name: contains } }] },
      take,
      orderBy: { creationDate: "desc" },
      include: { entity: { select: { id: true, name: true } } },
    }),
    prisma.meeting.findMany({
      where: { OR: [{ title: contains }, { notes: contains }, { nextSteps: contains }] },
      take,
      orderBy: { meetingDate: "desc" },
      include: { entity: { select: { id: true, name: true } } },
    }),
    prisma.demo.findMany({
      where: { OR: [{ title: contains }, { notes: contains }, { nextSteps: contains }] },
      take,
      orderBy: { demoDate: "desc" },
      include: { entity: { select: { id: true, name: true } } },
    }),
    prisma.rfpRfi.findMany({
      where: { OR: [{ title: contains }, { notes: contains }] },
      take,
      orderBy: { contactDate: "desc" },
      include: { entity: { select: { id: true, name: true } } },
    }),
  ]);
  return { entities, contacts, proposals, meetings, demos, rfps };
}
