import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Fab } from "@/components/shared/fab";
import { ListFilters } from "@/components/shared/list-filters";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveList, RowLink } from "@/components/shared/responsive-list";
import { EntityStatusBadge } from "@/components/shared/status-badges";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/i18n";
import { ENTITY_STATUSES } from "@/lib/validation/crm";
import { listEntities, type EntitySort } from "@/server/data/entities";
import { enumParam, param, type SearchParams } from "@/server/view";

export const metadata = { title: t.entity.plural };

export default async function EntitiesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const entities = await listEntities({
    q: param(sp.q),
    status: enumParam(sp.status, ENTITY_STATUSES),
    sort: enumParam<EntitySort>(sp.sort, ["name", "updated", "created"]),
    includeArchived: param(sp.archived) === "1",
  });

  return (
    <>
      <PageHeader
        title={t.entity.plural}
        subtitle={`${entities.length}`}
        actions={
          <Button asChild className="hidden md:inline-flex">
            <Link href="/entities/new">
              <Plus /> {t.entity.new}
            </Link>
          </Button>
        }
      />
      <ListFilters
        selects={[
          {
            name: "status",
            label: t.entity.status,
            emptyLabel: t.common.all,
            options: ENTITY_STATUSES.map((s) => ({ value: s, label: t.enums.entityStatus[s] })),
          },
          {
            name: "sort",
            label: t.common.sort,
            emptyLabel: t.entity.sortName,
            options: [
              { value: "updated", label: t.entity.sortRecent },
              { value: "created", label: t.entity.sortCreated },
            ],
          },
        ]}
        toggle={{ name: "archived", label: t.entity.showArchived }}
      />
      <ResponsiveList
        items={entities}
        getKey={(e) => e.id}
        getHref={(e) => `/entities/${e.id}`}
        table={{
          head: (
            <tr>
              <th>{t.entity.name}</th>
              <th>{t.entity.status}</th>
              <th>{t.entity.city}</th>
              <th>{t.common.tags}</th>
              <th className="text-right">{t.contact.plural}</th>
              <th className="text-right">{t.proposal.plural}</th>
              <th className="text-right">{t.common.date}</th>
            </tr>
          ),
          row: (e) => (
            <>
              <td>
                <RowLink href={`/entities/${e.id}`}>{e.name}</RowLink>
                {e.archivedAt && (
                  <Badge variant="outline" className="ml-2">
                    {t.entity.archivedBadge}
                  </Badge>
                )}
              </td>
              <td>
                <EntityStatusBadge status={e.status} />
              </td>
              <td className="text-muted-foreground">{e.city}</td>
              <td>
                <span className="flex flex-wrap gap-1">
                  {e.tags.map(({ tag }) => (
                    <Badge key={tag.id} variant="outline">
                      {tag.label}
                    </Badge>
                  ))}
                </span>
              </td>
              <td className="text-right tabular-nums">{e._count.contacts}</td>
              <td className="text-right tabular-nums">{e._count.proposals}</td>
              <td className="text-muted-foreground text-right">{formatDate(e.updatedAt)}</td>
            </>
          ),
        }}
        card={(e) => (
          <>
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">{e.name}</span>
              <EntityStatusBadge status={e.status} />
            </div>
            <p className="text-muted-foreground mt-0.5 truncate text-xs">
              {[
                e.city,
                `${e._count.contacts} ${t.contact.plural.toLowerCase()}`,
                `${e._count.proposals} ${t.proposal.plural.toLowerCase()}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </>
        )}
      />
      <Fab href="/entities/new" label={t.entity.new} />
    </>
  );
}
