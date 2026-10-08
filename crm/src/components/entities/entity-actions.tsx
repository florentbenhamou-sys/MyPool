"use client";

import Link from "next/link";
import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/shared/confirm-action";
import { t } from "@/lib/i18n";
import { deleteEntityAction, setEntityArchivedAction } from "@/server/actions/entities";

export function EntityActions({
  id,
  archived,
  hasProposals,
}: {
  id: string;
  archived: boolean;
  hasProposals: boolean;
}) {
  return (
    <>
      <Button asChild variant="outline">
        <Link href={`/entities/${id}/edit`}>
          <Pencil /> {t.common.edit}
        </Link>
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
        action={() => setEntityArchivedAction(id, !archived)}
      />
      {!hasProposals && (
        <ConfirmAction
          trigger={
            <Button variant="outline" className="text-destructive">
              <Trash2 /> {t.common.delete}
            </Button>
          }
          description={`${t.common.confirmDeleteText} Contacts, meetings, démos et RFP/RFI de l'entité seront supprimés.`}
          action={() => deleteEntityAction(id)}
          redirectTo="/entities"
        />
      )}
    </>
  );
}
