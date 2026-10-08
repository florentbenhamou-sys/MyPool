"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { FormActions } from "@/components/shared/form-actions";
import { useActionForm } from "@/components/shared/use-action-form";
import { t } from "@/lib/i18n";
import {
  ENTITY_STATUSES,
  quickEntitySchema,
  type QuickEntityData,
  type QuickEntityFormInput,
} from "@/lib/validation/crm";
import { quickCreateEntityAction } from "@/server/actions/entities";

/**
 * Saisie rapide « salon » (mobile-first) : entité + contact + vecteur + note
 * en un seul écran, une seule colonne, claviers adaptés (email, tel).
 */
export function QuickEntityForm({
  channelTypes,
  today,
  defaultChannelTypeId,
}: {
  channelTypes: { id: string; label: string; code: string }[];
  today: string;
  defaultChannelTypeId?: string;
}) {
  const router = useRouter();
  const form = useForm<QuickEntityFormInput, unknown, QuickEntityData>({
    resolver: zodResolver(quickEntitySchema),
    defaultValues: {
      name: "",
      status: "PROSPECT",
      contactFirstName: "",
      contactLastName: "",
      contactEmail: "",
      contactPhone: "",
      contactRole: "",
      channelTypeId: defaultChannelTypeId ?? "",
      eventName: "",
      contactDate: today,
      notes: "",
    },
  });
  const { register, formState, watch } = form;
  const e = formState.errors;
  const { onSubmit, pending } = useActionForm(form, quickCreateEntityAction, {
    successMessage: t.entity.created,
    onSuccess: ({ id }) => router.push(`/entities/${id}`),
  });
  const selectedType = channelTypes.find((c) => c.id === watch("channelTypeId"));

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-2xl flex-col gap-5">
      <section className="flex flex-col gap-4">
        <FormField label={t.entity.nameLong} htmlFor="name" required error={e.name?.message}>
          <Input
            id="name"
            autoFocus
            autoComplete="organization"
            autoCapitalize="words"
            {...register("name")}
          />
        </FormField>
        <FormField label={t.entity.status} htmlFor="status">
          <NativeSelect id="status" {...register("status")}>
            {ENTITY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t.enums.entityStatus[s]}
              </option>
            ))}
          </NativeSelect>
        </FormField>
      </section>

      <section className="bg-card flex flex-col gap-4 rounded-lg border p-4">
        <div>
          <h2 className="font-semibold">{t.entity.firstContact}</h2>
          <p className="text-muted-foreground text-xs">{t.entity.firstContactHint}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t.contact.firstName} htmlFor="cfn" error={e.contactFirstName?.message}>
            <Input
              id="cfn"
              autoComplete="given-name"
              autoCapitalize="words"
              {...register("contactFirstName")}
            />
          </FormField>
          <FormField label={t.contact.lastName} htmlFor="cln" error={e.contactLastName?.message}>
            <Input
              id="cln"
              autoComplete="family-name"
              autoCapitalize="words"
              {...register("contactLastName")}
            />
          </FormField>
        </div>
        <FormField label={t.contact.email} htmlFor="cem" error={e.contactEmail?.message}>
          <Input
            id="cem"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            {...register("contactEmail")}
          />
        </FormField>
        <FormField label={t.contact.phone} htmlFor="cph" error={e.contactPhone?.message}>
          <Input
            id="cph"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            {...register("contactPhone")}
          />
        </FormField>
        <FormField label={t.contact.role} htmlFor="crole">
          <Input id="crole" autoComplete="organization-title" {...register("contactRole")} />
        </FormField>
      </section>

      <section className="bg-card flex flex-col gap-4 rounded-lg border p-4">
        <h2 className="font-semibold">{t.entity.origin}</h2>
        <FormField label={t.channel.type} htmlFor="ctype" error={e.channelTypeId?.message}>
          <NativeSelect id="ctype" {...register("channelTypeId")}>
            <option value="">—</option>
            {channelTypes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        {selectedType?.code === "EVENT" && (
          <FormField label={t.channel.eventName} htmlFor="event">
            <Input id="event" list="event-suggestions" {...register("eventName")} />
          </FormField>
        )}
        <FormField label={t.channel.contactDate} htmlFor="cdate" error={e.contactDate?.message}>
          <Input id="cdate" type="date" {...register("contactDate")} />
        </FormField>
      </section>

      <FormField label={t.common.notes} htmlFor="notes">
        <Textarea id="notes" rows={4} {...register("notes")} />
      </FormField>

      <FormActions pending={pending} />
    </form>
  );
}
