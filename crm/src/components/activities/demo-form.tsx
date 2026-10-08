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
import { demoSchema, type DemoData, type DemoFormInput } from "@/lib/validation/crm";
import { saveDemoAction } from "@/server/actions/activities";

export function DemoForm({
  demoId,
  defaultValues,
  meetings,
  targetOptions,
  tagOptions,
}: {
  demoId?: string;
  defaultValues: DemoFormInput;
  meetings: { id: string; label: string }[];
  targetOptions: ChipOption[];
  tagOptions: ChipOption[];
}) {
  const router = useRouter();
  const form = useForm<DemoFormInput, unknown, DemoData>({
    resolver: zodResolver(demoSchema),
    defaultValues,
  });
  const { register, control, formState } = form;
  const e = formState.errors;
  const { onSubmit, pending } = useActionForm(form, (v) => saveDemoAction(demoId ?? null, v), {
    onSuccess: ({ id }) => router.push(`/demos/${id}`),
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-3xl flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label={t.common.title}
          htmlFor="d-title"
          required
          error={e.title?.message}
          className="md:col-span-2"
        >
          <Input id="d-title" {...register("title")} />
        </FormField>
        <FormField label={t.demo.date} htmlFor="d-date" required error={e.demoDate?.message}>
          <Input id="d-date" type="datetime-local" {...register("demoDate")} />
        </FormField>
        <FormField label={t.demo.meeting} htmlFor="d-meeting">
          <NativeSelect id="d-meeting" {...register("meetingId")}>
            <option value="">—</option>
            {meetings.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </NativeSelect>
        </FormField>
      </div>
      <FormField label={t.demo.targets}>
        <Controller
          control={control}
          name="targetIds"
          render={({ field }) => (
            <ChipSelect
              options={targetOptions}
              value={field.value ?? []}
              onChange={field.onChange}
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
      <FormField label={t.common.notes} htmlFor="d-notes">
        <Textarea id="d-notes" rows={5} {...register("notes")} />
      </FormField>
      <FormField label={t.common.nextSteps} htmlFor="d-next">
        <Textarea id="d-next" rows={3} {...register("nextSteps")} />
      </FormField>
      <FormField label={t.common.transcript} htmlFor="d-transcript">
        <Textarea id="d-transcript" rows={8} {...register("transcript")} />
      </FormField>
      <FormActions pending={pending} />
    </form>
  );
}
