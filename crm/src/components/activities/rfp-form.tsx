"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FormActions } from "@/components/shared/form-actions";
import { useActionForm } from "@/components/shared/use-action-form";
import { t } from "@/lib/i18n";
import {
  RFP_RFI_TYPES,
  rfpRfiSchema,
  type RfpRfiData,
  type RfpRfiFormInput,
} from "@/lib/validation/crm";
import { saveRfpAction } from "@/server/actions/activities";

export function RfpForm({
  rfpId,
  defaultValues,
}: {
  rfpId?: string;
  defaultValues: RfpRfiFormInput;
}) {
  const router = useRouter();
  const form = useForm<RfpRfiFormInput, unknown, RfpRfiData>({
    resolver: zodResolver(rfpRfiSchema),
    defaultValues,
  });
  const { register, formState } = form;
  const e = formState.errors;
  const { onSubmit, pending } = useActionForm(form, (v) => saveRfpAction(rfpId ?? null, v), {
    onSuccess: ({ id }) => router.push(`/rfps/${id}`),
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-3xl flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label={t.common.type} htmlFor="r-type">
          <NativeSelect id="r-type" {...register("type")}>
            {RFP_RFI_TYPES.map((v) => (
              <option key={v} value={v}>
                {t.enums.rfpRfiType[v]}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label={t.common.title} htmlFor="r-title" required error={e.title?.message}>
          <Input id="r-title" {...register("title")} />
        </FormField>
        <FormField
          label={t.rfp.contactDate}
          htmlFor="r-cdate"
          required
          error={e.contactDate?.message}
        >
          <Input id="r-cdate" type="date" {...register("contactDate")} />
        </FormField>
        <FormField label={t.rfp.responseDate} htmlFor="r-rdate" error={e.responseDate?.message}>
          <Input id="r-rdate" type="date" {...register("responseDate")} />
        </FormField>
        <FormField
          label={t.rfp.presentationDate}
          htmlFor="r-pdate"
          error={e.presentationDate?.message}
        >
          <Input id="r-pdate" type="date" {...register("presentationDate")} />
        </FormField>
      </div>
      <FormField label={t.common.notes} htmlFor="r-notes">
        <Textarea id="r-notes" rows={6} {...register("notes")} />
      </FormField>
      <FormActions pending={pending} />
    </form>
  );
}
