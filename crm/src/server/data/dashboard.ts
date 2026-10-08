import "server-only";
import { prisma } from "../db";
import { proposalTreeInclude } from "./proposals";
import { openRfpWhere } from "./rfps";

const ACTIVE_PROPOSAL_STATUSES = ["DRAFT", "IN_PREPARATION", "SENT", "NEGOTIATION"] as const;

export async function getDashboardData(now: Date, today: Date) {
  const in30days = new Date(today.getTime() + 30 * 24 * 3600 * 1000);
  const [
    prospects,
    clients,
    openRfpCount,
    activeProposalCount,
    latestChannels,
    upcomingMeetings,
    latestDemos,
    openRfps,
    recentProposals,
    expiringProposals,
  ] = await Promise.all([
    prisma.entity.count({ where: { status: "PROSPECT", archivedAt: null } }),
    prisma.entity.count({ where: { status: "CLIENT", archivedAt: null } }),
    prisma.rfpRfi.count({ where: openRfpWhere(today) }),
    prisma.proposal.count({
      where: { archivedAt: null, status: { in: [...ACTIVE_PROPOSAL_STATUSES] } },
    }),
    prisma.contactChannel.findMany({
      orderBy: [{ contactDate: "desc" }, { createdAt: "desc" }],
      take: 6,
      include: {
        entity: { select: { id: true, name: true } },
        type: true,
        contact: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.meeting.findMany({
      where: { meetingDate: { gte: now } },
      orderBy: { meetingDate: "asc" },
      take: 6,
      include: { entity: { select: { id: true, name: true } } },
    }),
    prisma.demo.findMany({
      orderBy: { demoDate: "desc" },
      take: 6,
      include: { entity: { select: { id: true, name: true } } },
    }),
    prisma.rfpRfi.findMany({
      where: openRfpWhere(today),
      orderBy: [{ responseDate: { sort: "asc", nulls: "last" } }],
      take: 6,
      include: { entity: { select: { id: true, name: true } } },
    }),
    prisma.proposal.findMany({
      where: { archivedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: { entity: { select: { id: true, name: true } }, ...proposalTreeInclude },
    }),
    prisma.proposal.findMany({
      where: {
        archivedAt: null,
        status: { in: [...ACTIVE_PROPOSAL_STATUSES] },
        validityDate: { gte: today, lte: in30days },
      },
      orderBy: { validityDate: "asc" },
      take: 6,
      include: { entity: { select: { id: true, name: true } } },
    }),
  ]);
  return {
    prospects,
    clients,
    openRfpCount,
    activeProposalCount,
    latestChannels,
    upcomingMeetings,
    latestDemos,
    openRfps,
    recentProposals,
    expiringProposals,
  };
}
