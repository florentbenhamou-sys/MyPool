import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Fab } from "@/components/shared/fab";
import { ListFilters } from "@/components/shared/list-filters";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveList, RowLink } from "@/components/shared/responsive-list";
import { TagBadges } from "@/components/shared/status-badges";
import { t } from "@/lib/i18n";
import { listDemos } from "@/server/data/demos";
import { listReferences } from "@/server/data/references";
import { fmtDateTime, param, type SearchParams } from "@/server/view";

export const metadata = { title: t.demo.plural };

export default async function DemosPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const [demos, targets] = await Promise.all([
    listDemos({ q: param(sp.q), targetId: param(sp.target) }),
    listReferences("demoTarget"),
  ]);
  return (
    <>
      <PageHeader
        title={t.demo.plural}
        actions={
          <Button asChild className="hidden md:inline-flex">
            <Link href="/demos/new">
              <Plus /> {t.demo.new}
            </Link>
          </Button>
        }
      />
      <ListFilters
        selects={[
          {
            name: "target",
            label: t.demo.targets,
            emptyLabel: `${t.demo.targets} : ${t.common.all.toLowerCase()}`,
            options: targets.map((d) => ({ value: d.id, label: d.label })),
          },
        ]}
      />
      <ResponsiveList
        items={demos}
        getKey={(d) => d.id}
        getHref={(d) => `/demos/${d.id}`}
        table={{
          head: (
            <tr>
              <th>{t.common.date}</th>
              <th>{t.common.title}</th>
              <th>{t.common.entity}</th>
              <th>{t.demo.targets}</th>
              <th>{t.common.tags}</th>
            </tr>
          ),
          row: (d) => (
            <>
              <td className="whitespace-nowrap tabular-nums">{fmtDateTime(d.demoDate)}</td>
              <td>
                <RowLink href={`/demos/${d.id}`}>
                  #{d.counter} — {d.title}
                </RowLink>
              </td>
              <td>
                <Link href={`/entities/${d.entity.id}`} className="hover:underline">
                  {d.entity.name}
                </Link>
              </td>
              <td>
                <TagBadges tags={d.targets.map((x) => x.demoTarget)} />
              </td>
              <td>
                <TagBadges tags={d.tags.map((x) => x.tag)} />
              </td>
            </>
          ),
        }}
        card={(d) => (
          <>
            <p className="truncate font-medium">
              #{d.counter} — {d.title}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {fmtDateTime(d.demoDate)} · {d.entity.name}
            </p>
            <div className="mt-1">
              <TagBadges tags={d.targets.map((x) => x.demoTarget)} />
            </div>
          </>
        )}
      />
      <Fab href="/demos/new" label={t.demo.new} />
    </>
  );
}
