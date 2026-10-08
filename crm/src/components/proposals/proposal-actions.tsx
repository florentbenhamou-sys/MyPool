"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Copy, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/shared/confirm-action";
import { IconButton } from "@/components/shared/row-menu";
import { t } from "@/lib/i18n";
import {
  deleteScenarioAction,
  duplicateProposalAction,
  removeProductAction,
  setProposalArchivedAction,
} from "@/server/actions/proposals";

export function ProposalActions({ id, archived }: { id: string; archived: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <>
      <Button asChild variant="outline">
        <Link href={`/proposals/${id}/edit`}>
          <Pencil /> {t.common.edit}
        </Link>
      </Button>
      <Button
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await duplicateProposalAction(id);
            if (!r.ok) return void toast.error(r.error);
            toast.success(t.proposal.duplicated);
            router.push(`/proposals/${r.data.id}`);
          })
        }
      >
        <Copy /> {t.common.duplicate}
      </Button>
      <ConfirmAction
        trigger={
          <Button variant="outline">
            {archived ? <ArchiveRestore /> : <Archive />}
            {archived ? t.common.unarchive : t.common.archive}
          </Button>
        }
        title={archived ? t.common.unarchive : t.common.archive}
        description=""
        confirmLabel={archived ? t.common.unarchive : t.common.archive}
        successMessage={t.common.saved}
        action={() => setProposalArchivedAction(id, !archived)}
      />
    </>
  );
}

export function RemoveProductButton({
  proposalId,
  proposalProductId,
}: {
  proposalId: string;
  proposalProductId: string;
}) {
  return (
    <ConfirmAction
      trigger={
        <IconButton label={t.proposal.removeProduct} className="text-destructive">
          <Trash2 />
        </IconButton>
      }
      title={t.proposal.removeProduct}
      action={() => removeProductAction(proposalProductId)}
      redirectTo={`/proposals/${proposalId}`}
    />
  );
}

export function DeleteScenarioButton({
  proposalId,
  proposalProductId,
  scenarioId,
}: {
  proposalId: string;
  proposalProductId: string;
  scenarioId: string;
}) {
  return (
    <ConfirmAction
      trigger={
        <IconButton label={t.proposal.deleteScenario} className="text-destructive">
          <Trash2 />
        </IconButton>
      }
      title={t.proposal.deleteScenario}
      action={() => deleteScenarioAction(scenarioId)}
      redirectTo={`/proposals/${proposalId}?product=${proposalProductId}`}
    />
  );
}
