"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { EditDialog } from "@/components/catalog/edit-dialog";
import { FormActions } from "@/components/shared/form-actions";
import { useActionForm } from "@/components/shared/use-action-form";
import { t } from "@/lib/i18n";
import {
  optionLineSchema,
  type OptionLineData,
  type OptionLineFormInput,
} from "@/lib/validation/proposal";
import { addOptionLineAction, updateOptionLineAction } from "@/server/actions/proposals";
import { PricePreview } from "./price-preview";
import type { LineView, OptionKind } from "./types";

/** Option de service (parentId = id du service du scénario) ou option libre (parentId = id du scénario). */
export function OptionLineDialog({
  kind,
  parentId,
  line,
  currency,
  trigger,
}: {
  kind: OptionKind;
  parentId: string;
  line?: LineView;
  currency: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<OptionLineFormInput, unknown, OptionLineData>({
    resolver: zodResolver(optionLineSchema),
    defaultValues: {
      description: line?.description ?? "",
      listPrice: line?.listPrice ?? "",
      discount: line ? line.discount : "0",
      displayDiscount: line?.displayDiscount ?? true,
    },
  });
  const { register, formState, watch } = form;
  const e = formState.errors;
  const { onSubmit, pending } = useActionForm(
    form,
    (v) =>
      line ? updateOptionLineAction(kind, line.id, v) : addOptionLineAction(kind, parentId, v),
    {
      onSuccess: () => {
        setOpen(false);
        if (!line) form.reset();
      },
    },
  );
  const title = line
    ? line.description
    : kind === "serviceOption"
      ? t.pricing.addOption
      : t.pricing.addAdditionalOption;

  return (
    <EditDialog open={open} onOpenChange={setOpen} title={title} trigger={trigger}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormField
          label={t.common.description}
          htmlFor="ol-desc"
          required
          error={e.description?.message}
        >
          <Input id="ol-desc" {...register("description")} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label={`${t.pricing.listPrice} (${t.pricing.oneShot})`}
            htmlFor="ol-price"
            required
            error={e.listPrice?.message}
          >
            <Input id="ol-price" inputMode="decimal" {...register("listPrice")} />
          </FormField>
          <FormField label={t.pricing.discount} htmlFor="ol-disc" error={e.discount?.message}>
            <Input id="ol-disc" inputMode="decimal" {...register("discount")} />
          </FormField>
        </div>
        <PricePreview
          listPrice={watch("listPrice")}
          discount={watch("discount") ?? "0"}
          currency={currency}
        />
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <Checkbox {...register("displayDiscount")} /> {t.pricing.displayDiscount}
        </label>
        <FormActions pending={pending} sticky={false} onCancel={() => setOpen(false)} />
      </form>
    </EditDialog>
  );
}
