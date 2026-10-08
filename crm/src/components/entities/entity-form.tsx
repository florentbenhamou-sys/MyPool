"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { ChipSelect, type ChipOption } from "@/components/shared/chip-select";
import { FormActions } from "@/components/shared/form-actions";
import { useActionForm } from "@/components/shared/use-action-form";
import { t } from "@/lib/i18n";
import {
  ENTITY_STATUSES,
  entitySchema,
  type EntityData,
  type EntityFormInput,
} from "@/lib/validation/crm";
import { createEntityAction, updateEntityAction } from "@/server/actions/entities";

export function EntityForm({
  entityId,
  defaultValues,
  tagOptions,
}: {
  entityId?: string;
  defaultValues: EntityFormInput;
  tagOptions: ChipOption[];
}) {
  const router = useRouter();
  const form = useForm<EntityFormInput, unknown, EntityData>({
    resolver: zodResolver(entitySchema),
    defaultValues,
  });
  const { register, formState, control } = form;
  const e = formState.errors;
  const { onSubmit, pending } = useActionForm(
    form,
    (values) => (entityId ? updateEntityAction(entityId, values) : createEntityAction(values)),
    { onSuccess: ({ id }) => router.push(`/entities/${id}`) },
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-3xl flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label={t.entity.name}
          htmlFor="name"
          required
          error={e.name?.message}
          className="md:col-span-2"
        >
          <Input id="name" autoComplete="organization" {...register("name")} />
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
        <FormField label={t.entity.language} htmlFor="lang">
          <NativeSelect id="lang" {...register("communicationLanguage")}>
            <option value="">—</option>
            {Object.entries(t.languages).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField
          label={t.entity.website}
          htmlFor="website"
          error={e.website?.message}
          className="md:col-span-2"
        >
          <Input
            id="website"
            type="url"
            inputMode="url"
            autoCapitalize="none"
            placeholder="https://"
            {...register("website")}
          />
        </FormField>
        <FormField label={t.entity.addressLine1} htmlFor="a1" className="md:col-span-2">
          <Input id="a1" autoComplete="address-line1" {...register("addressLine1")} />
        </FormField>
        <FormField label={t.entity.addressLine2} htmlFor="a2" className="md:col-span-2">
          <Input id="a2" autoComplete="address-line2" {...register("addressLine2")} />
        </FormField>
        <FormField label={t.entity.postalCode} htmlFor="pc">
          <Input id="pc" autoComplete="postal-code" {...register("postalCode")} />
        </FormField>
        <FormField label={t.entity.city} htmlFor="city">
          <Input id="city" autoComplete="address-level2" {...register("city")} />
        </FormField>
        <FormField label={t.entity.country} htmlFor="country">
          <Input id="country" autoComplete="country-name" {...register("country")} />
        </FormField>
      </div>
      <FormField label={t.common.tags}>
        <Controller
          control={control}
          name="tagIds"
          render={({ field }) => (
            <ChipSelect options={tagOptions} value={field.value ?? []} onChange={field.onChange} />
          )}
        />
      </FormField>
      <FormField label={t.common.notes} htmlFor="notes">
        <Textarea id="notes" rows={5} {...register("notes")} />
      </FormField>
      <FormActions pending={pending} />
    </form>
  );
}
