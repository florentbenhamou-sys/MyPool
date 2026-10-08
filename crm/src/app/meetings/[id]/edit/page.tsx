import { MeetingForm } from "@/components/activities/meeting-form";
import { PageHeader } from "@/components/shared/page-header";
import { t } from "@/lib/i18n";
import { getMeeting } from "@/server/data/meetings";
import { listReferences } from "@/server/data/references";
import { contactChipOptions, tagOptions } from "@/server/form-options";
import { dateTimeInputValue, orNotFound } from "@/server/view";

export default async function EditMeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await orNotFound(getMeeting(id));
  const [contacts, tags, targets] = await Promise.all([
    contactChipOptions(m.entityId),
    tagOptions(),
    listReferences("demoTarget"),
  ]);
  return (
    <>
      <PageHeader
        title={`${t.common.edit} — ${t.enums.meetingType[m.type]} #${m.counter}`}
        subtitle={m.entity.name}
        back={{ href: `/meetings/${id}`, label: m.title }}
      />
      <MeetingForm
        meetingId={id}
        contactOptions={contacts}
        tagOptions={tags}
        demoTargets={targets.map((d) => ({ id: d.id, label: d.label }))}
        defaultValues={{
          entityId: m.entityId,
          type: m.type,
          title: m.title,
          meetingDate: dateTimeInputValue(m.meetingDate),
          demoTargetId: m.demoTargetId ?? "",
          notes: m.notes ?? "",
          transcript: m.transcript ?? "",
          nextSteps: m.nextSteps ?? "",
          contactIds: m.contacts.map((c) => c.contactId),
          tagIds: m.tags.map((x) => x.tagId),
        }}
      />
    </>
  );
}
