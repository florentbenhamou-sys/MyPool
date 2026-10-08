"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/shared/confirm-action";
import { EmptyState } from "@/components/shared/empty-state";
import { IconButton } from "@/components/shared/row-menu";
import { t } from "@/lib/i18n";
import { deleteChannelAction } from "@/server/actions/entities";
import { ChannelDialog, type ChannelView } from "./channel-dialog";

export interface ChannelRow extends ChannelView {
  typeLabel: string;
  contactName: string | null;
  contactDateLabel: string;
}

export function ChannelsPanel({
  entityId,
  channels,
  channelTypes,
  contacts,
  today,
}: {
  entityId: string;
  channels: ChannelRow[];
  channelTypes: { id: string; label: string }[];
  contacts: { id: string; name: string }[];
  today: string;
}) {
  const dialogProps = { entityId, channelTypes, contacts, today };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <ChannelDialog
          {...dialogProps}
          trigger={
            <Button>
              <Plus /> {t.channel.new}
            </Button>
          }
        />
      </div>
      {channels.length === 0 ? (
        <EmptyState>{t.common.emptyList}</EmptyState>
      ) : (
        <ul className="bg-card divide-y rounded-lg border">
          {channels.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {[c.typeLabel, c.eventName, c.contactName].filter(Boolean).join(" — ")}
                </p>
                <p className="text-muted-foreground text-sm">{c.contactDateLabel}</p>
                {c.notes && (
                  <p className="text-muted-foreground mt-1 text-sm whitespace-pre-line">
                    {c.notes}
                  </p>
                )}
              </div>
              <div className="flex shrink-0">
                <ChannelDialog
                  {...dialogProps}
                  channel={c}
                  trigger={
                    <IconButton label={t.common.edit}>
                      <Pencil />
                    </IconButton>
                  }
                />
                <ConfirmAction
                  trigger={
                    <IconButton label={t.common.delete} className="text-destructive">
                      <Trash2 />
                    </IconButton>
                  }
                  action={() => deleteChannelAction(c.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
