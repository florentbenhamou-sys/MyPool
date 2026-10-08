import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Fab } from "@/components/shared/fab";
import { ListFilters } from "@/components/shared/list-filters";
import { PageHeader } from "@/components/shared/page-header";
import { ProposalAmount } from "@/components/shared/proposal-amount";
import { ResponsiveList, RowLink } from "@/components/shared/responsive-list";
import { ProposalStatusBadge } from "@/components/shared/status-badges";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/i18n";
import { PROPOSAL_STATUSES } from "@/lib/validation/proposal";
import { listProposals } from "@/server/data/proposals";
import { proposalHeadline } from "@/server/proposal-view";
import { enumParam, param, type SearchParams } from "@/server/view";

export const metadata = { title: t.proposal.plural };

export default async function ProposalsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const proposals = (
    await listProposals({
      q: param(sp.q),
      status: enumParam(sp.status, PROPOSAL_STATUSES),
      includeArchived: param(sp.archived) === "1",
    })
  ).map((p) => ({ ...p, headline: proposalHeadline(p) }));

  return (
    <>
      <PageHeader
        title={t.proposal.plural}
        actions={
          <Button asChild className="hidden md:inline-flex">
            <Link href="/proposals/new">
              <Plus /> {t.proposal.new}
            </Link>
          </Button>
        }
      />
      <ListFilters
        selects={[
          {
            name: "status",
            label: t.proposal.status,
            emptyLabel: t.common.all,
            options: PROPOSAL_STATUSES.map((s) => ({ value: s, label: t.enums.proposalStatus[s] })),
          },
        ]}
        toggle={{ name: "archived", label: t.proposal.showArchived }}
      />
      <ResponsiveList
        items={proposals}
        getKey={(p) => p.id}
        getHref={(p) => `/proposals/${p.id}`}
        table={{
          head: (
            <tr>
              <th>{t.proposal.number}</th>
              <th>{t.proposal.client}</th>
              <th>{t.proposal.creationDate}</th>
              <th>{t.proposal.validityDate}</th>
              <th>{t.proposal.status}</th>
              <th className="text-right">{t.proposal.amount}</th>
            </tr>
          ),
          row: (p) => (
            <>
              <td className="whitespace-nowrap">
                <RowLink href={`/proposals/${p.id}`}>{p.number}</RowLink>
                {p.archivedAt && (
                  <Badge variant="outline" className="ml-2">
                    {t.proposal.archived}
                  </Badge>
                )}
              </td>
              <td>
                <Link href={`/entities/${p.entity.id}`} className="hover:underline">
                  {p.entity.name}
                </Link>
              </td>
              <td className="tabular-nums">{formatDate(p.creationDate)}</td>
              <td className="tabular-nums">{formatDate(p.validityDate) || "—"}</td>
              <td>
                <ProposalStatusBadge status={p.status} />
              </td>
              <td className="text-right">
                <ProposalAmount headline={p.headline} currency={p.currency} />
              </td>
            </>
          ),
        }}
        card={(p) => (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{p.number}</span>
              <ProposalStatusBadge status={p.status} />
            </div>
            <p className="truncate text-sm">{p.entity.name}</p>
            <p className="text-muted-foreground mt-1 flex flex-wrap justify-between gap-x-3 text-xs">
              <span>
                {formatDate(p.creationDate)}
                {p.validityDate && ` → ${formatDate(p.validityDate)}`}
              </span>
              <ProposalAmount headline={p.headline} currency={p.currency} />
            </p>
          </>
        )}
      />
      <Fab href="/proposals/new" label={t.proposal.new} />
    </>
  );
}
