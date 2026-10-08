import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Fab } from "@/components/shared/fab";
import { ListFilters } from "@/components/shared/list-filters";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveList, RowLink } from "@/components/shared/responsive-list";
import { TagBadges } from "@/components/shared/status-badges";
import { t } from "@/lib/i18n";
import { listMeetings } from "@/server/data/meetings";
import { enumParam, fmtDateTime, param, type SearchParams } from "@/server/view";

export const metadata = { title: t.meeting.plural };

export default async function MeetingsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const meetings = await listMeetings({
    q: param(sp.q),
    when: enumParam(sp.when, ["upcoming", "past"] as const),
  });
  return (
    <>
      <PageHeader
        title={t.meeting.plural}
        actions={
          <Button asChild className="hidden md:inline-flex">
            <Link href="/meetings/new">
              <Plus /> {t.meeting.new}
            </Link>
          </Button>
        }
      />
      <ListFilters
        selects={[
          {
            name: "when",
            label: t.common.filter,
            emptyLabel: t.common.all,
            options: [
              { value: "upcoming", label: t.meeting.upcoming },
              { value: "past", label: t.meeting.past },
            ],
          },
        ]}
      />
      <ResponsiveList
        items={meetings}
        getKey={(m) => m.id}
        getHref={(m) => `/meetings/${m.id}`}
        table={{
          head: (
            <tr>
              <th>{t.common.date}</th>
              <th>{t.common.title}</th>
              <th>{t.common.entity}</th>
              <th>{t.common.type}</th>
              <th>{t.common.tags}</th>
              <th className="text-right">{t.common.participants}</th>
            </tr>
          ),
          row: (m) => (
            <>
              <td className="whitespace-nowrap tabular-nums">{fmtDateTime(m.meetingDate)}</td>
              <td>
                <RowLink href={`/meetings/${m.id}`}>
                  #{m.counter} — {m.title}
                </RowLink>
              </td>
              <td>
                <Link href={`/entities/${m.entity.id}`} className="hover:underline">
                  {m.entity.name}
                </Link>
              </td>
              <td>
                <Badge variant="outline">{t.enums.meetingType[m.type]}</Badge>
              </td>
              <td>
                <TagBadges tags={m.tags.map((x) => x.tag)} />
              </td>
              <td className="text-right tabular-nums">{m._count.contacts}</td>
            </>
          ),
        }}
        card={(m) => (
          <>
            <p className="truncate font-medium">
              #{m.counter} — {m.title}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {fmtDateTime(m.meetingDate)} · {m.entity.name}
            </p>
          </>
        )}
      />
      <Fab href="/meetings/new" label={t.meeting.new} />
    </>
  );
}
