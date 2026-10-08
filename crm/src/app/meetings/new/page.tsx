import { MeetingForm } from "@/components/activities/meeting-form";
import { EntityPicker } from "@/components/shared/entity-picker";
import { PageHeader } from "@/components/shared/page-header";
import { t } from "@/lib/i18n";
import { getEntity } from "@/server/data/entities";
import { listReferences } from "@/server/data/references";
import { contactChipOptions, entityPickerOptions, tagOptions } from "@/server/form-options";
import { nextHourInputValue, orNotFound, param, type SearchParams } from "@/server/view";

export const metadata = { title: t.meeting.new };

export default async function NewMeetingPage({ searchParams }: { searchParams: SearchParams }) {
  const entityId = param((await searchParams).entityId);
  if (!entityId) {
    return (
      <>
        <PageHeader title={t.meeting.new} back={{ href: "/meetings", label: t.meeting.plural }} />
        <EntityPicker entities={await entityPickerOptions()} basePath="/meetings/new" />
      </>
    );
  }
  const [entity, contacts, tags, targets] = await Promise.all([
    orNotFound(getEntity(entityId)),
    contactChipOptions(entityId),
    tagOptions(),
    listReferences("demoTarget"),
  ]);
  return (
    <>
      <PageHeader
        title={t.meeting.new}
        subtitle={entity.name}
        back={{ href: `/entities/${entityId}?tab=meetings`, label: entity.name }}
      />
      <MeetingForm
        contactOptions={contacts}
        tagOptions={tags}
        demoTargets={targets.map((d) => ({ id: d.id, label: d.label }))}
        defaultValues={{
          entityId,
          type: "MEETING",
          title: "",
          meetingDate: nextHourInputValue(),
          demoTargetId: "",
          notes: "",
          transcript: "",
          nextSteps: "",
          contactIds: [],
          tagIds: [],
        }}
      />
    </>
  );
}
