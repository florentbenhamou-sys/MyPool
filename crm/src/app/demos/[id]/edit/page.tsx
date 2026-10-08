import { DemoForm } from "@/components/activities/demo-form";
import { PageHeader } from "@/components/shared/page-header";
import { t } from "@/lib/i18n";
import { getDemo } from "@/server/data/demos";
import { listMeetingOptions } from "@/server/data/meetings";
import { demoTargetOptions, tagOptions } from "@/server/form-options";
import { dateTimeInputValue, fmtDateTime, orNotFound } from "@/server/view";

export default async function EditDemoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await orNotFound(getDemo(id));
  const [meetings, targets, tags] = await Promise.all([
    listMeetingOptions(d.entityId),
    demoTargetOptions(),
    tagOptions(),
  ]);
  return (
    <>
      <PageHeader
        title={`${t.common.edit} — Demo #${d.counter}`}
        subtitle={d.entity.name}
        back={{ href: `/demos/${id}`, label: d.title }}
      />
      <DemoForm
        demoId={id}
        meetings={meetings.map((m) => ({
          id: m.id,
          label: `#${m.counter} — ${m.title} (${fmtDateTime(m.meetingDate)})`,
        }))}
        targetOptions={targets}
        tagOptions={tags}
        defaultValues={{
          entityId: d.entityId,
          meetingId: d.meetingId ?? "",
          title: d.title,
          demoDate: dateTimeInputValue(d.demoDate),
          notes: d.notes ?? "",
          transcript: d.transcript ?? "",
          nextSteps: d.nextSteps ?? "",
          targetIds: d.targets.map((x) => x.demoTargetId),
          tagIds: d.tags.map((x) => x.tagId),
        }}
      />
    </>
  );
}
