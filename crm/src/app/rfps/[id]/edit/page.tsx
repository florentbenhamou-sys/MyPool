import { RfpForm } from "@/components/activities/rfp-form";
import { PageHeader } from "@/components/shared/page-header";
import { toDateInput } from "@/lib/format";
import { t } from "@/lib/i18n";
import { getRfp } from "@/server/data/rfps";
import { orNotFound } from "@/server/view";

export default async function EditRfpPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await orNotFound(getRfp(id));
  return (
    <>
      <PageHeader
        title={`${t.common.edit} — ${r.type} #${r.counter}`}
        subtitle={r.entity.name}
        back={{ href: `/rfps/${id}`, label: r.title }}
      />
      <RfpForm
        rfpId={id}
        defaultValues={{
          entityId: r.entityId,
          type: r.type,
          title: r.title,
          contactDate: toDateInput(r.contactDate),
          responseDate: toDateInput(r.responseDate),
          presentationDate: toDateInput(r.presentationDate),
          notes: r.notes ?? "",
        }}
      />
    </>
  );
}
