import { RfpForm } from "@/components/activities/rfp-form";
import { EntityPicker } from "@/components/shared/entity-picker";
import { PageHeader } from "@/components/shared/page-header";
import { t } from "@/lib/i18n";
import { getEntity } from "@/server/data/entities";
import { entityPickerOptions } from "@/server/form-options";
import { orNotFound, param, todayValue, type SearchParams } from "@/server/view";

export const metadata = { title: t.rfp.new };

export default async function NewRfpPage({ searchParams }: { searchParams: SearchParams }) {
  const entityId = param((await searchParams).entityId);
  if (!entityId) {
    return (
      <>
        <PageHeader title={t.rfp.new} back={{ href: "/rfps", label: t.rfp.plural }} />
        <EntityPicker entities={await entityPickerOptions()} basePath="/rfps/new" />
      </>
    );
  }
  const entity = await orNotFound(getEntity(entityId));
  return (
    <>
      <PageHeader
        title={t.rfp.new}
        subtitle={entity.name}
        back={{ href: `/entities/${entityId}?tab=rfps`, label: entity.name }}
      />
      <RfpForm
        defaultValues={{
          entityId,
          type: "RFP",
          title: "",
          contactDate: todayValue(),
          responseDate: "",
          presentationDate: "",
          notes: "",
        }}
      />
    </>
  );
}
