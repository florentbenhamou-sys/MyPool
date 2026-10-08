import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RfpDetailActions } from "@/components/activities/delete-buttons";
import { RfpFiles } from "@/components/activities/rfp-files";
import { Properties, TextBlock } from "@/components/shared/detail";
import { PageHeader } from "@/components/shared/page-header";
import { ProposalStatusBadge } from "@/components/shared/status-badges";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/i18n";
import { config } from "@/server/config";
import { getRfp } from "@/server/data/rfps";
import { ALLOWED_UPLOADS } from "@/server/storage";
import { fmtDateTime, orNotFound } from "@/server/view";

function sizeLabel(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.ceil(bytes / 1024)} Ko`
    : `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;
}

export default async function RfpPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await orNotFound(getRfp(id));
  return (
    <>
      <PageHeader
        title={`${r.type} #${r.counter} — ${r.title}`}
        back={{ href: `/entities/${r.entity.id}?tab=rfps`, label: r.entity.name }}
        actions={<RfpDetailActions id={id} entityId={r.entity.id} />}
      />
      <div className="flex flex-col gap-4">
        <Properties
          items={[
            {
              label: t.common.entity,
              value: (
                <Link href={`/entities/${r.entity.id}`} className="text-primary hover:underline">
                  {r.entity.name}
                </Link>
              ),
            },
            { label: t.rfp.contactDate, value: formatDate(r.contactDate) },
            { label: t.rfp.responseDate, value: formatDate(r.responseDate) },
            { label: t.rfp.presentationDate, value: formatDate(r.presentationDate) },
            {
              label: t.proposal.plural,
              value:
                r.proposals.length > 0 &&
                r.proposals.map((p) => (
                  <Link
                    key={p.id}
                    href={`/proposals/${p.id}`}
                    className="text-primary flex items-center gap-2 hover:underline"
                  >
                    {p.number} <ProposalStatusBadge status={p.status} />
                  </Link>
                )),
            },
          ]}
        />
        <RfpFiles
          rfpId={id}
          maxMb={config().MAX_UPLOAD_MB}
          accept={Object.keys(ALLOWED_UPLOADS)
            .map((e) => `.${e}`)
            .join(",")}
          files={r.files.map((f) => ({
            id: f.id,
            fileName: f.fileName,
            sizeLabel: sizeLabel(f.sizeBytes),
            dateLabel: fmtDateTime(f.createdAt),
          }))}
        />
        <TextBlock title={t.common.notes} text={r.notes} />
        <div>
          <Button asChild variant="outline">
            <Link href={`/proposals/new?entityId=${r.entity.id}&rfpRfiId=${r.id}`}>
              <Plus /> {t.proposal.new}
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}
