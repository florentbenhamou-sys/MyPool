"use client";

import { DetailActions } from "@/components/shared/detail-actions";
import {
  deleteDemoAction,
  deleteMeetingAction,
  deleteRfpAction,
} from "@/server/actions/activities";

export function MeetingDetailActions({ id, entityId }: { id: string; entityId: string }) {
  return (
    <DetailActions
      editHref={`/meetings/${id}/edit`}
      onDelete={() => deleteMeetingAction(id)}
      redirectTo={`/entities/${entityId}?tab=meetings`}
    />
  );
}

export function DemoDetailActions({ id, entityId }: { id: string; entityId: string }) {
  return (
    <DetailActions
      editHref={`/demos/${id}/edit`}
      onDelete={() => deleteDemoAction(id)}
      redirectTo={`/entities/${entityId}?tab=demos`}
    />
  );
}

export function RfpDetailActions({ id, entityId }: { id: string; entityId: string }) {
  return (
    <DetailActions
      editHref={`/rfps/${id}/edit`}
      onDelete={() => deleteRfpAction(id)}
      redirectTo={`/entities/${entityId}?tab=rfps`}
    />
  );
}
