import { DemoForm } from "@/components/activities/demo-form";
import { EntityPicker } from "@/components/shared/entity-picker";
import { PageHeader } from "@/components/shared/page-header";
import { t } from "@/lib/i18n";
import { getEntity } from "@/server/data/entities";
import { listMeetingOptions } from "@/server/data/meetings";
import { demoTargetOptions, entityPickerOptions, tagOptions } from "@/server/form-options";
import {
  fmtDateTime,
  nextHourInputValue,
  orNotFound,
  param,
  type SearchParams,
} from "@/server/view";

export const metadata = { title: t.demo.new };

export default async function NewDemoPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const entityId = param(sp.entityId);
  if (!entityId) {
    return (
      <>
        <PageHeader title={t.demo.new} back={{ href: "/demos", label: t.demo.plural }} />
        <EntityPicker entities={await entityPickerOptions()} basePath="/demos/new" />
      </>
    );
  }
  const [entity, meetings, targets, tags] = await Promise.all([
    orNotFound(getEntity(entityId)),
    listMeetingOptions(entityId),
    demoTargetOptions(),
    tagOptions(),
  ]);
  const meetingId = param(sp.meetingId);
  return (
    <>
      <PageHeader
        title={t.demo.new}
        subtitle={entity.name}
        back={{ href: `/entities/${entityId}?tab=demos`, label: entity.name }}
      />
      <DemoForm
        meetings={meetings.map((m) => ({
          id: m.id,
          label: `#${m.counter} — ${m.title} (${fmtDateTime(m.meetingDate)})`,
        }))}
        targetOptions={targets}
        tagOptions={tags}
        defaultValues={{
          entityId,
          meetingId: meetings.some((m) => m.id === meetingId) ? meetingId : "",
          title: "",
          demoDate: nextHourInputValue(),
          notes: "",
          transcript: "",
          nextSteps: "",
          targetIds: [],
          tagIds: [],
        }}
      />
    </>
  );
}
