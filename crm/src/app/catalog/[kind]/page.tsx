import { notFound } from "next/navigation";
import { PriceCatalogView } from "@/components/catalog/price-catalog-view";
import { PageHeader } from "@/components/shared/page-header";
import { t } from "@/lib/i18n";
import { listPriceCatalog, type PriceCatalogKind } from "@/server/data/catalog";
import { defaultCurrency } from "@/server/view";

/** /catalog/subscriptions | /catalog/services | /catalog/maintenances */
const KINDS: Record<string, { kind: PriceCatalogKind; title: string; hint: string }> = {
  subscriptions: {
    kind: "subscription",
    title: t.catalog.subscriptions,
    hint: `${t.pricing.annual}`,
  },
  services: { kind: "service", title: t.catalog.services, hint: t.pricing.oneShot },
  maintenances: { kind: "maintenance", title: t.catalog.maintenances, hint: t.pricing.oneShot },
};

export async function generateMetadata({ params }: { params: Promise<{ kind: string }> }) {
  return { title: KINDS[(await params).kind]?.title };
}

export default async function PriceCatalogPage({ params }: { params: Promise<{ kind: string }> }) {
  const config = KINDS[(await params).kind];
  if (!config) notFound();
  const items = await listPriceCatalog(config.kind);
  return (
    <>
      <PageHeader
        title={config.title}
        subtitle={`${t.pricing.listPrice} : ${config.hint.toLowerCase()}`}
      />
      <PriceCatalogView kind={config.kind} items={items} defaultCurrency={defaultCurrency()} />
    </>
  );
}
