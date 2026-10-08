import Link from "next/link";
import { Lock, Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { IconButton } from "@/components/shared/row-menu";
import { ProposalStatusBadge } from "@/components/shared/status-badges";
import { CombinationsTable } from "@/components/proposals/combinations-table";
import {
  DeleteScenarioButton,
  ProposalActions,
  RemoveProductButton,
} from "@/components/proposals/proposal-actions";
import { ProposalSummaryCard } from "@/components/proposals/proposal-summary-card";
import { ScenarioEditor } from "@/components/proposals/scenario-editor";
import { LinkTabs } from "@/components/proposals/scenario-tabs";
import { AddProductDialog, ScenarioDialog } from "@/components/proposals/structure-dialogs";
import { MobileSummaryBar, ScenarioSummaryPanel } from "@/components/proposals/summary-panel";
import type { CatalogOptions } from "@/components/proposals/types";
import { calculateProposalSummary, computeRange, type ScenarioResult } from "@/domain/pricing";
import { formatDate, formatMoney } from "@/lib/format";
import { t } from "@/lib/i18n";
import { LOCKED_PROPOSAL_STATUSES } from "@/lib/validation/proposal";
import { listPriceCatalog, listProducts } from "@/server/data/catalog";
import { getProposal } from "@/server/data/proposals";
import { toProposalInput } from "@/server/mappers/pricing";
import { buildScenarioView } from "@/server/proposal-view";
import { orNotFound, param, type SearchParams } from "@/server/view";

/** Montant année 1 d'un scénario : combinaison retenue, fourchette des combinaisons, ou total. */
function scenarioFirstYearLabel(r: ScenarioResult, currency: string) {
  if (r.selectedCombination)
    return formatMoney(r.selectedCombination.firstYearTotal.toFixed(2), currency);
  const range = r.hasAlternatives ? computeRange(r.combinations) : null;
  if (range && !range.min.firstYearTotal.equals(range.max.firstYearTotal)) {
    return `${formatMoney(range.min.firstYearTotal.toFixed(2), currency)} – ${formatMoney(range.max.firstYearTotal.toFixed(2), currency)}`;
  }
  return formatMoney((range?.min.firstYearTotal ?? r.summary.firstYearTotal).toFixed(2), currency);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = await getProposal((await params).id).catch(() => null);
  return { title: p?.number ?? t.proposal.singular };
}

export default async function ProposalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const proposal = await orNotFound(getProposal(id));
  const [products, subscriptions, services, maintenances] = await Promise.all([
    listProducts(false),
    listPriceCatalog("subscription", false),
    listPriceCatalog("service", false),
    listPriceCatalog("maintenance", false),
  ]);
  const catalog: CatalogOptions = {
    subscription: subscriptions,
    service: services,
    maintenance: maintenances,
  };

  // Tous les calculs viennent du moteur métier (src/domain/pricing).
  const summary = calculateProposalSummary(toProposalInput(proposal));
  const currency = proposal.currency;
  const locked = Boolean(proposal.archivedAt) || LOCKED_PROPOSAL_STATUSES.includes(proposal.status);

  const product = proposal.products.find((p) => p.id === param(sp.product)) ?? proposal.products[0];
  const productSummary = summary.products.find((p) => p.productId === product?.id);
  const scenario =
    product?.scenarios.find((s) => s.id === param(sp.scenario)) ?? product?.scenarios[0];
  const scenarioResult = productSummary?.scenarios.find((s) => s.scenarioId === scenario?.id);
  const scenarioView =
    scenario && scenarioResult ? buildScenarioView(scenario, scenarioResult) : null;

  return (
    <div className={scenarioView ? "pb-16 lg:pb-0" : undefined}>
      <PageHeader
        title={proposal.number}
        back={{ href: "/proposals", label: t.proposal.plural }}
        subtitle={
          <span className="flex flex-wrap gap-x-3">
            <Link
              href={`/entities/${proposal.entity.id}?tab=proposals`}
              className="text-primary font-medium hover:underline"
            >
              {proposal.entity.name}
            </Link>
            <span>{formatDate(proposal.creationDate)}</span>
            {proposal.validityDate && (
              <span>
                {t.proposal.validityDate} : {formatDate(proposal.validityDate)}
              </span>
            )}
            {proposal.contractDuration && <span>{proposal.contractDuration} mois</span>}
            {proposal.rfpRfi && (
              <Link href={`/rfps/${proposal.rfpRfi.id}`} className="hover:underline">
                {proposal.rfpRfi.type} #{proposal.rfpRfi.counter}
              </Link>
            )}
          </span>
        }
        badges={
          <>
            <ProposalStatusBadge status={proposal.status} />
            {proposal.archivedAt && <Badge variant="outline">{t.proposal.archived}</Badge>}
            <Badge variant="outline">{currency}</Badge>
          </>
        }
        actions={<ProposalActions id={id} archived={Boolean(proposal.archivedAt)} />}
      />

      {locked && (
        <p className="border-warning/40 bg-warning/10 mb-4 flex items-center gap-2 rounded-md border p-3 text-sm">
          <Lock className="size-4 shrink-0" /> {t.proposal.locked}
        </p>
      )}

      {/* Produits */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {proposal.products.length > 0 && (
          <LinkTabs
            activeId={product?.id}
            items={proposal.products.map((pp) => ({
              id: pp.id,
              href: `/proposals/${id}?product=${pp.id}`,
              label: pp.displayNameSnapshot,
            }))}
          />
        )}
        {!locked && (
          <AddProductDialog
            proposalId={id}
            products={products.map((p) => ({ id: p.id, name: p.name, code: p.code }))}
            trigger={
              <Button variant="outline">
                <Plus /> {t.proposal.addProduct}
              </Button>
            }
          />
        )}
      </div>

      {!product && <EmptyState>{t.proposal.noProducts}</EmptyState>}

      {product && (
        <>
          <Card className="mb-4">
            <CardContent className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs uppercase">{t.proposal.product}</p>
                <p className="font-semibold">{product.displayNameSnapshot}</p>
                {product.displayDescriptionSnapshot && (
                  <p className="text-muted-foreground text-sm whitespace-pre-line">
                    {product.displayDescriptionSnapshot}
                  </p>
                )}
                {productSummary?.range && (
                  <p className="mt-1 text-sm">
                    {t.pricing.firstYear} :{" "}
                    <span className="money font-medium">
                      {productSummary.range.min.firstYearTotal.equals(
                        productSummary.range.max.firstYearTotal,
                      )
                        ? formatMoney(productSummary.range.min.firstYearTotal.toFixed(2), currency)
                        : `${formatMoney(productSummary.range.min.firstYearTotal.toFixed(2), currency)} – ${formatMoney(productSummary.range.max.firstYearTotal.toFixed(2), currency)}`}
                    </span>
                  </p>
                )}
              </div>
              {!locked && <RemoveProductButton proposalId={id} proposalProductId={product.id} />}
            </CardContent>
          </Card>

          {/* Scénarios (alternatives) */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <LinkTabs
              activeId={scenario?.id}
              items={product.scenarios.map((s) => {
                const r = productSummary?.scenarios.find((x) => x.scenarioId === s.id);
                return {
                  id: s.id,
                  href: `/proposals/${id}?product=${product.id}&scenario=${s.id}`,
                  label: s.name,
                  sub: r && scenarioFirstYearLabel(r, currency),
                };
              })}
            />
            {!locked && (
              <ScenarioDialog
                proposalId={id}
                proposalProductId={product.id}
                trigger={
                  <Button variant="outline">
                    <Plus /> {t.proposal.addScenario}
                  </Button>
                }
              />
            )}
            {!locked && scenario && (
              <span className="flex">
                <ScenarioDialog
                  proposalId={id}
                  proposalProductId={product.id}
                  scenario={{
                    id: scenario.id,
                    name: scenario.name,
                    description: scenario.description,
                  }}
                  trigger={
                    <IconButton label={t.common.edit}>
                      <Pencil />
                    </IconButton>
                  }
                />
                {product.scenarios.length > 1 && (
                  <DeleteScenarioButton
                    proposalId={id}
                    proposalProductId={product.id}
                    scenarioId={scenario.id}
                  />
                )}
              </span>
            )}
          </div>
          {product.scenarios.length > 1 && (
            <p className="text-muted-foreground mb-4 text-xs">{t.proposal.alternativesWarning}</p>
          )}

          {scenarioView && (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="flex min-w-0 flex-col gap-4">
                {scenarioView.description && (
                  <p className="text-muted-foreground text-sm whitespace-pre-line">
                    {scenarioView.description}
                  </p>
                )}
                <ScenarioEditor
                  scenario={scenarioView}
                  catalog={catalog}
                  currency={currency}
                  locked={locked}
                />
                <CombinationsTable
                  scenarioId={scenarioView.id}
                  combinations={scenarioView.combinations}
                  currency={currency}
                  locked={locked}
                />
              </div>
              <aside className="lg:sticky lg:top-20 lg:self-start">
                <ScenarioSummaryPanel
                  title={scenarioView.name}
                  summary={scenarioView.summary}
                  currency={currency}
                  hasAlternatives={scenarioView.hasAlternatives}
                />
              </aside>
              <MobileSummaryBar summary={scenarioView.summary} currency={currency} />
            </div>
          )}
        </>
      )}

      {proposal.products.length > 0 && (
        <div className="mt-6">
          <ProposalSummaryCard summary={summary} currency={currency} />
        </div>
      )}

      {proposal.notes && (
        <Card className="mt-4">
          <CardContent className="text-sm whitespace-pre-line">{proposal.notes}</CardContent>
        </Card>
      )}
    </div>
  );
}
