import Link from "next/link";
import { DemoDetailActions } from "@/components/activities/delete-buttons";
import { Properties, TextBlock } from "@/components/shared/detail";
import { PageHeader } from "@/components/shared/page-header";
import { TagBadges } from "@/components/shared/status-badges";
import { t } from "@/lib/i18n";
import { getDemo } from "@/server/data/demos";
import { fmtDateTime, orNotFound } from "@/server/view";

export default async function DemoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await orNotFound(getDemo(id));
  return (
    <>
      <PageHeader
        title={`Demo #${d.counter} — ${d.title}`}
        back={{ href: `/entities/${d.entity.id}?tab=demos`, label: d.entity.name }}
        badges={<TagBadges tags={d.tags.map((x) => x.tag)} />}
        actions={<DemoDetailActions id={id} entityId={d.entity.id} />}
      />
      <div className="flex flex-col gap-4">
        <Properties
          items={[
            { label: t.demo.date, value: fmtDateTime(d.demoDate) },
            {
              label: t.common.entity,
              value: (
                <Link href={`/entities/${d.entity.id}`} className="text-primary hover:underline">
                  {d.entity.name}
                </Link>
              ),
            },
            {
              label: t.demo.targets,
              value: d.targets.length > 0 && (
                <TagBadges tags={d.targets.map((x) => x.demoTarget)} />
              ),
            },
            {
              label: t.demo.meeting,
              value: d.meeting && (
                <Link href={`/meetings/${d.meeting.id}`} className="text-primary hover:underline">
                  #{d.meeting.counter} — {d.meeting.title}
                </Link>
              ),
            },
          ]}
        />
        <TextBlock title={t.common.nextSteps} text={d.nextSteps} />
        <TextBlock title={t.common.notes} text={d.notes} />
        <TextBlock title={t.common.transcript} text={d.transcript} />
      </div>
    </>
  );
}
