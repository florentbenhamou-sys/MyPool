import { PageHeader } from "@/components/shared/page-header";
import { QuickEntityForm } from "@/components/entities/quick-entity-form";
import { t } from "@/lib/i18n";
import { listReferences } from "@/server/data/references";
import { todayValue } from "@/server/view";

export const metadata = { title: t.entity.new };

/** Création d'entité = saisie rapide (cas d'usage salon). Les autres champs se complètent ensuite. */
export default async function NewEntityPage() {
  const channelTypes = await listReferences("channelType");
  return (
    <>
      <PageHeader title={t.entity.new} back={{ href: "/entities", label: t.entity.plural }} />
      <QuickEntityForm
        channelTypes={channelTypes.map((c) => ({ id: c.id, label: c.label, code: c.code }))}
        defaultChannelTypeId={channelTypes.find((c) => c.code === "EVENT")?.id}
        today={todayValue()}
      />
    </>
  );
}
