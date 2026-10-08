import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MeetingDetailActions } from "@/components/activities/delete-buttons";
import { Properties, TextBlock } from "@/components/shared/detail";
import { PageHeader } from "@/components/shared/page-header";
import { TagBadges } from "@/components/shared/status-badges";
import { t } from "@/lib/i18n";
import { getMeeting } from "@/server/data/meetings";
import { fmtDateTime, orNotFound } from "@/server/view";

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await orNotFound(getMeeting(id));
  return (
    <>
      <PageHeader
        title={`${t.enums.meetingType[m.type]} #${m.counter} — ${m.title}`}
        back={{ href: `/entities/${m.entity.id}?tab=meetings`, label: m.entity.name }}
        badges={<TagBadges tags={m.tags.map((x) => x.tag)} />}
        actions={<MeetingDetailActions id={id} entityId={m.entity.id} />}
      />
      <div className="flex flex-col gap-4">
        <Properties
          items={[
            { label: t.meeting.date, value: fmtDateTime(m.meetingDate) },
            {
              label: t.common.entity,
              value: (
                <Link href={`/entities/${m.entity.id}`} className="text-primary hover:underline">
                  {m.entity.name}
                </Link>
              ),
            },
            { label: t.meeting.demoTarget, value: m.demoTarget?.label },
            {
              label: t.common.participants,
              value: m.contacts.length > 0 && (
                <span className="flex flex-wrap gap-1">
                  {m.contacts.map(({ contact }) => (
                    <Badge key={contact.id} variant="secondary">
                      {contact.firstName} {contact.lastName}
                    </Badge>
                  ))}
                </span>
              ),
            },
            {
              label: t.demo.plural,
              value:
                m.demos.length > 0 &&
                m.demos.map((d) => (
                  <Link
                    key={d.id}
                    href={`/demos/${d.id}`}
                    className="text-primary block hover:underline"
                  >
                    Demo #{d.counter} — {d.title}
                  </Link>
                )),
            },
          ]}
        />
        <TextBlock title={t.common.nextSteps} text={m.nextSteps} />
        <TextBlock title={t.common.notes} text={m.notes} />
        <TextBlock title={t.common.transcript} text={m.transcript} />
        <div>
          <Button asChild variant="outline">
            <Link href={`/demos/new?entityId=${m.entity.id}&meetingId=${m.id}`}>
              <Plus /> {t.demo.new}
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}
