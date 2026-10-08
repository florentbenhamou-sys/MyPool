import { PageHeader } from "@/components/shared/page-header";
import { ProposalForm } from "@/components/proposals/proposal-form";
import { toDateInput } from "@/lib/format";
import { t } from "@/lib/i18n";
import { getProposal } from "@/server/data/proposals";
import { listRfpOptions } from "@/server/data/rfps";
import { orNotFound } from "@/server/view";

export default async function EditProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await orNotFound(getProposal(id));
  const rfps = await listRfpOptions(p.entityId);
  return (
    <>
      <PageHeader
        title={`${t.common.edit} — ${p.number}`}
        subtitle={p.entity.name}
        back={{ href: `/proposals/${id}`, label: p.number }}
      />
      <ProposalForm
        proposalId={id}
        rfps={rfps.map((r) => ({ id: r.id, label: `${r.type} #${r.counter} — ${r.title}` }))}
        defaultValues={{
          entityId: p.entityId,
          creationDate: toDateInput(p.creationDate),
          validityDate: toDateInput(p.validityDate),
          contractDuration: p.contractDuration ? String(p.contractDuration) : "",
          status: p.status,
          currency: p.currency,
          notes: p.notes ?? "",
          rfpRfiId: p.rfpRfiId ?? "",
        }}
      />
    </>
  );
}
