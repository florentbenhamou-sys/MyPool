"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { FormActions } from "@/components/shared/form-actions";
import { useActionForm } from "@/components/shared/use-action-form";
import { t } from "@/lib/i18n";
import { channelSchema, type ChannelData, type ChannelFormInput } from "@/lib/validation/crm";
import { saveChannelAction } from "@/server/actions/entities";

export interface ChannelView {
  id: string;
  typeId: string;
  contactId: string | null;
  eventName: string | null;
  contactDate: string;
  notes: string | null;
}

export function ChannelDialog({
  entityId,
  channel,
  channelTypes,
  contacts,
  today,
  trigger,
}: {
  entityId: string;
  channel?: ChannelView;
  channelTypes: { id: string; label: string }[];
  contacts: { id: string; name: string }[];
  today: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<ChannelFormInput, unknown, ChannelData>({
    resolver: zodResolver(channelSchema),
    defaultValues: {
      typeId: channel?.typeId ?? channelTypes[0]?.id ?? "",
      contactId: channel?.contactId ?? "",
      eventName: channel?.eventName ?? "",
      contactDate: channel?.contactDate ?? today,
      notes: channel?.notes ?? "",
    },
  });
  const { register, formState } = form;
  const e = formState.errors;
  const { onSubmit, pending } = useActionForm(
    form,
    (values) => saveChannelAction(entityId, channel?.id ?? null, values),
    {
      onSuccess: () => {
        setOpen(false);
        if (!channel) form.reset();
      },
    },
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{channel ? t.channel.singular : t.channel.new}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <FormField label={t.channel.type} htmlFor="ch-type" required error={e.typeId?.message}>
            <NativeSelect id="ch-type" {...register("typeId")}>
              {channelTypes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label={t.channel.contact} htmlFor="ch-contact">
            <NativeSelect id="ch-contact" {...register("contactId")}>
              <option value="">—</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label={t.channel.eventName} htmlFor="ch-event">
            <Input id="ch-event" {...register("eventName")} />
          </FormField>
          <FormField
            label={t.channel.contactDate}
            htmlFor="ch-date"
            required
            error={e.contactDate?.message}
          >
            <Input id="ch-date" type="date" {...register("contactDate")} />
          </FormField>
          <FormField label={t.common.notes} htmlFor="ch-notes">
            <Textarea id="ch-notes" rows={3} {...register("notes")} />
          </FormField>
          <FormActions pending={pending} sticky={false} onCancel={() => setOpen(false)} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
