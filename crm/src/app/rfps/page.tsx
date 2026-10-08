import Link from "next/link";
import { Paperclip, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Fab } from "@/components/shared/fab";
import { ListFilters } from "@/components/shared/list-filters";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveList, RowLink } from "@/components/shared/responsive-list";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/i18n";
import { listRfps } from "@/server/data/rfps";
import { param, todayDate, type SearchParams } from "@/server/view";

export const metadata = { title: t.rfp.plural };

export default async function RfpsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const rfps = await listRfps({ q: param(sp.q), open: param(sp.open) === "1" }, todayDate());
  return (
    <>
      <PageHeader
        title={t.rfp.plural}
        actions={
          <Button asChild className="hidden md:inline-flex">
            <Link href="/rfps/new">
              <Plus /> {t.rfp.new}
            </Link>
          </Button>
        }
      />
      <ListFilters toggle={{ name: "open", label: t.rfp.open }} />
      <ResponsiveList
        items={rfps}
        getKey={(r) => r.id}
        getHref={(r) => `/rfps/${r.id}`}
        table={{
          head: (
            <tr>
              <th>{t.common.type}</th>
              <th>{t.rfp.number}</th>
              <th>{t.common.title}</th>
              <th>{t.common.entity}</th>
              <th>{t.rfp.contactDate}</th>
              <th>{t.rfp.responseDate}</th>
              <th>{t.rfp.presentationDate}</th>
              <th className="text-right">{t.rfp.files}</th>
            </tr>
          ),
          row: (r) => (
            <>
              <td>
                <Badge variant="outline">{r.type}</Badge>
              </td>
              <td className="tabular-nums">#{r.counter}</td>
              <td>
                <RowLink href={`/rfps/${r.id}`}>{r.title}</RowLink>
              </td>
              <td>
                <Link href={`/entities/${r.entity.id}`} className="hover:underline">
                  {r.entity.name}
                </Link>
              </td>
              <td className="tabular-nums">{formatDate(r.contactDate)}</td>
              <td className="tabular-nums">{formatDate(r.responseDate) || "—"}</td>
              <td className="tabular-nums">{formatDate(r.presentationDate) || "—"}</td>
              <td className="text-right tabular-nums">{r._count.files}</td>
            </>
          ),
        }}
        card={(r) => (
          <>
            <p className="truncate font-medium">
              {r.type} #{r.counter} — {r.title}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {r.entity.name} · {t.rfp.responseDate} : {formatDate(r.responseDate) || "—"}
            </p>
            {r._count.files > 0 && (
              <p className="text-muted-foreground mt-1 inline-flex items-center gap-1 text-xs">
                <Paperclip className="size-3" /> {r._count.files}
              </p>
            )}
          </>
        )}
      />
      <Fab href="/rfps/new" label={t.rfp.new} />
    </>
  );
}
