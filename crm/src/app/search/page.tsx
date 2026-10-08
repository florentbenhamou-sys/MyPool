import { LinkList } from "@/components/shared/link-list";
import { PageHeader } from "@/components/shared/page-header";
import { EntityStatusBadge, ProposalStatusBadge } from "@/components/shared/status-badges";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/i18n";
import { globalSearch } from "@/server/data/search";
import { fmtDateTime, param, type SearchParams } from "@/server/view";

export const metadata = { title: t.searchPage.title };

function Group({
  title,
  children,
  count,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-muted-foreground text-sm font-semibold uppercase">
        {title} ({count})
      </h2>
      {children}
    </section>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const q = param((await searchParams).q) ?? "";
  const r = q.length >= 2 ? await globalSearch(q) : null;
  const total = r ? Object.values(r).reduce((n, list) => n + list.length, 0) : 0;
  return (
    <>
      <PageHeader
        title={q ? `${t.searchPage.title} : « ${q} »` : t.searchPage.title}
        subtitle={t.searchPage.hint}
      />
      {!r && <p className="text-muted-foreground text-sm">{t.searchPage.minChars}</p>}
      {r && total === 0 && <p className="text-muted-foreground text-sm">{t.searchPage.noResult}</p>}
      {r && (
        <div className="flex flex-col gap-6">
          <Group title={t.entity.plural} count={r.entities.length}>
            <LinkList
              items={r.entities.map((e) => ({
                id: e.id,
                href: `/entities/${e.id}`,
                primary: e.name,
                secondary: e.city,
                aside: <EntityStatusBadge status={e.status} />,
              }))}
            />
          </Group>
          <Group title={t.contact.plural} count={r.contacts.length}>
            <LinkList
              items={r.contacts.map((c) => ({
                id: c.id,
                href: `/entities/${c.entity.id}?tab=contacts`,
                primary: `${c.firstName} ${c.lastName}`,
                secondary: `${c.entity.name} · ${c.email}`,
              }))}
            />
          </Group>
          <Group title={t.proposal.plural} count={r.proposals.length}>
            <LinkList
              items={r.proposals.map((p) => ({
                id: p.id,
                href: `/proposals/${p.id}`,
                primary: `${p.number} — ${p.entity.name}`,
                secondary: formatDate(p.creationDate),
                aside: <ProposalStatusBadge status={p.status} />,
              }))}
            />
          </Group>
          <Group title={t.meeting.plural} count={r.meetings.length}>
            <LinkList
              items={r.meetings.map((m) => ({
                id: m.id,
                href: `/meetings/${m.id}`,
                primary: `#${m.counter} — ${m.title}`,
                secondary: `${m.entity.name} · ${fmtDateTime(m.meetingDate)}`,
              }))}
            />
          </Group>
          <Group title={t.demo.plural} count={r.demos.length}>
            <LinkList
              items={r.demos.map((d) => ({
                id: d.id,
                href: `/demos/${d.id}`,
                primary: `Demo #${d.counter} — ${d.title}`,
                secondary: `${d.entity.name} · ${fmtDateTime(d.demoDate)}`,
              }))}
            />
          </Group>
          <Group title={t.rfp.plural} count={r.rfps.length}>
            <LinkList
              items={r.rfps.map((x) => ({
                id: x.id,
                href: `/rfps/${x.id}`,
                primary: `${x.type} #${x.counter} — ${x.title}`,
                secondary: `${x.entity.name} · ${formatDate(x.contactDate)}`,
              }))}
            />
          </Group>
        </div>
      )}
    </>
  );
}
