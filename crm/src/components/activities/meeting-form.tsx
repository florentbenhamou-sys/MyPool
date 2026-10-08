"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ChipSelect, type ChipOption } from "@/components/shared/chip-select";
import { FormActions } from "@/components/shared/form-actions";
import { useActionForm } from "@/components/shared/use-action-form";
import { t } from "@/lib/i18n";
import {
  MEETING_TYPES,
  meetingSchema,
  type MeetingData,
  type MeetingFormInput,
} from "@/lib/validation/crm";
import { saveMeetingAction } from "@/server/actions/activities";

export function MeetingForm({
  meetingId,
  defaultValues,
  contactOptions,
  tagOptions,
  demoTargets,
}: {
  meetingId?: string;
  defaultValues: MeetingFormInput;
  contactOptions: ChipOption[];
  tagOptions: ChipOption[];
  demoTargets: { id: string; label: string }[];
}) {
  const router = useRouter();
  const form = useForm<MeetingFormInput, unknown, MeetingData>({
    resolver: zodResolver(meetingSchema),
    defaultValues,
  });
  const { register, control, formState } = form;
  const e = formState.errors;
  const { onSubmit, pending } = useActionForm(
    form,
    (v) => saveMeetingAction(meetingId ?? null, v),
    {
      onSuccess: ({ id }) => router.push(`/meetings/${id}`),
    },
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-3xl flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label={t.common.title}
          htmlFor="m-title"
          required
          error={e.title?.message}
          className="md:col-span-2"
        >
          <Input id="m-title" {...register("title")} />
        </FormField>
        <FormField label={t.common.type} htmlFor="m-type">
          <NativeSelect id="m-type" {...register("type")}>
            {MEETING_TYPES.map((v) => (
              <option key={v} value={v}>
                {t.enums.meetingType[v]}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label={t.meeting.date} htmlFor="m-date" required error={e.meetingDate?.message}>
          <Input id="m-date" type="datetime-local" {...register("meetingDate")} />
        </FormField>
        <FormField label={t.meeting.demoTarget} htmlFor="m-target">
          <NativeSelect id="m-target" {...register("demoTargetId")}>
            <option value="">—</option>
            {demoTargets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </NativeSelect>
        </FormField>
      </div>
      <FormField label={t.common.participants}>
        <Controller
          control={control}
          name="contactIds"
          render={({ field }) => (
            <ChipSelect
              options={contactOptions}
              value={field.value ?? []}
              onChange={field.onChange}
              emptyLabel={t.common.emptyList}
            />
          )}
        />
      </FormField>
      <FormField label={t.common.tags}>
        <Controller
          control={control}
          name="tagIds"
          render={({ field }) => (
            <ChipSelect options={tagOptions} value={field.value ?? []} onChange={field.onChange} />
          )}
        />
      </FormField>
      <FormField label={t.common.notes} htmlFor="m-notes">
        <Textarea id="m-notes" rows={5} {...register("notes")} />
      </FormField>
      <FormField label={t.common.nextSteps} htmlFor="m-next">
        <Textarea id="m-next" rows={3} {...register("nextSteps")} />
      </FormField>
      <FormField label={t.common.transcript} htmlFor="m-transcript">
        <Textarea id="m-transcript" rows={8} {...register("transcript")} />
      </FormField>
      <FormActions pending={pending} />
    </form>
  );
}
