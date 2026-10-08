import { EntityPicker } from "@/components/shared/entity-picker";
import { PageHeader } from "@/components/shared/page-header";
import { ProposalForm } from "@/components/proposals/proposal-form";
import { t } from "@/lib/i18n";
import { getEntity } from "@/server/data/entities";
import { listRfpOptions } from "@/server/data/rfps";
import { entityPickerOptions } from "@/server/form-options";
import { defaultCurrency, orNotFound, param, todayValue, type SearchParams } from "@/server/view";

export const metadata = { title: t.proposal.new };

export default async function NewProposalPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const entityId = param(sp.entityId);
  if (!entityId) {
    return (
      <>
        <PageHeader
          title={t.proposal.new}
          back={{ href: "/proposals", label: t.proposal.plural }}
        />
        <EntityPicker entities={await entityPickerOptions()} basePath="/proposals/new" />
      </>
    );
  }
  const [entity, rfps] = await Promise.all([
    orNotFound(getEntity(entityId)),
    listRfpOptions(entityId),
  ]);
  const rfpId = param(sp.rfpRfiId);
  return (
    <>
      <PageHeader
        title={t.proposal.new}
        subtitle={entity.name}
        back={{ href: `/entities/${entityId}?tab=proposals`, label: entity.name }}
      />
      <ProposalForm
        rfps={rfps.map((r) => ({ id: r.id, label: `${r.type} #${r.counter} — ${r.title}` }))}
        defaultValues={{
          entityId,
          creationDate: todayValue(),
          validityDate: "",
          contractDuration: "",
          status: "DRAFT",
          currency: defaultCurrency(),
          notes: "",
          rfpRfiId: rfps.some((r) => r.id === rfpId) ? rfpId : "",
        }}
      />
    </>
  );
}
