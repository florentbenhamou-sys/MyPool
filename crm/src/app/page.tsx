import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { ProposalAmount } from "@/components/shared/proposal-amount";
import { SectionCard, SectionRow } from "@/components/shared/section-card";
import { ProposalStatusBadge } from "@/components/shared/status-badges";
import { Fab } from "@/components/shared/fab";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/i18n";
import { getDashboardData } from "@/server/data/dashboard";
import { proposalHeadline } from "@/server/proposal-view";
import { fmtDateTime, todayDate } from "@/server/view";

export default async function DashboardPage() {
  const d = await getDashboardData(new Date(), todayDate());
  const kpis = [
    { label: t.dashboard.prospects, value: d.prospects, href: "/entities?status=PROSPECT" },
    { label: t.dashboard.clients, value: d.clients, href: "/entities?status=CLIENT" },
    { label: t.dashboard.openRfps, value: d.openRfpCount, href: "/rfps?open=1" },
    { label: t.dashboard.activeProposals, value: d.activeProposalCount, href: "/proposals" },
  ];

  return (
    <>
      <PageHeader
        title={t.dashboard.title}
        actions={
          <Button asChild className="hidden md:inline-flex">
            <Link href="/entities/new">
              <Plus /> {t.dashboard.quickCapture}
            </Link>
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href}>
            <Card className="hover:border-primary/40 h-full transition-colors">
              <CardContent>
                <p className="text-muted-foreground text-xs sm:text-sm">{k.label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums md:text-3xl">{k.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SectionCard
          title={t.dashboard.upcomingMeetings}
          href="/meetings?when=upcoming"
          empty={d.upcomingMeetings.length === 0}
        >
          {d.upcomingMeetings.map((m) => (
            <SectionRow
              key={m.id}
              href={`/meetings/${m.id}`}
              primary={m.title}
              secondary={m.entity.name}
              aside={fmtDateTime(m.meetingDate)}
            />
          ))}
        </SectionCard>

        <SectionCard
          title={t.dashboard.latestContacts}
          href="/entities?sort=updated"
          empty={d.latestChannels.length === 0}
        >
          {d.latestChannels.map((c) => (
            <SectionRow
              key={c.id}
              href={`/entities/${c.entity.id}`}
              primary={c.entity.name}
              secondary={[
                c.type.label,
                c.eventName,
                c.contact && `${c.contact.firstName} ${c.contact.lastName}`,
              ]
                .filter(Boolean)
                .join(" · ")}
              aside={formatDate(c.contactDate)}
            />
          ))}
        </SectionCard>

        <SectionCard
          title={t.dashboard.openRfps}
          href="/rfps?open=1"
          empty={d.openRfps.length === 0}
        >
          {d.openRfps.map((r) => (
            <SectionRow
              key={r.id}
              href={`/rfps/${r.id}`}
              primary={`${r.type} #${r.counter} — ${r.title}`}
              secondary={r.entity.name}
              aside={r.responseDate ? formatDate(r.responseDate) : "—"}
            />
          ))}
        </SectionCard>

        <SectionCard
          title={t.dashboard.recentProposals}
          href="/proposals"
          empty={d.recentProposals.length === 0}
        >
          {d.recentProposals.map((p) => (
            <SectionRow
              key={p.id}
              href={`/proposals/${p.id}`}
              primary={`${p.number} — ${p.entity.name}`}
              secondary={<ProposalStatusBadge status={p.status} />}
              aside={<ProposalAmount headline={proposalHeadline(p)} currency={p.currency} />}
            />
          ))}
        </SectionCard>

        <SectionCard
          title={t.dashboard.expiringProposals}
          href="/proposals"
          empty={d.expiringProposals.length === 0}
        >
          {d.expiringProposals.map((p) => (
            <SectionRow
              key={p.id}
              href={`/proposals/${p.id}`}
              primary={`${p.number} — ${p.entity.name}`}
              secondary={t.enums.proposalStatus[p.status]}
              aside={formatDate(p.validityDate)}
            />
          ))}
        </SectionCard>

        <SectionCard
          title={t.dashboard.latestDemos}
          href="/demos"
          empty={d.latestDemos.length === 0}
        >
          {d.latestDemos.map((demo) => (
            <SectionRow
              key={demo.id}
              href={`/demos/${demo.id}`}
              primary={`Demo #${demo.counter} — ${demo.title}`}
              secondary={demo.entity.name}
              aside={fmtDateTime(demo.demoDate)}
            />
          ))}
        </SectionCard>
      </div>

      <Fab href="/entities/new" label={t.entity.quickNew} />
    </>
  );
}
