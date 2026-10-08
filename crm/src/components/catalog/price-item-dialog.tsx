"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { FormActions } from "@/components/shared/form-actions";
import { useActionForm } from "@/components/shared/use-action-form";
import { t } from "@/lib/i18n";
import {
  priceItemSchema,
  type PriceItemData,
  type PriceItemFormInput,
} from "@/lib/validation/catalog";
import { savePriceItemAction } from "@/server/actions/catalog";
import { EditDialog } from "./edit-dialog";

export type PriceKind = "subscription" | "service" | "maintenance";

export interface PriceItemView {
  id: string;
  code: string;
  description: string;
  listPrice: string;
  currency: string;
  active: boolean;
  usageCount: number;
}

export function PriceItemDialog({
  kind,
  item,
  defaultCurrency,
  trigger,
}: {
  kind: PriceKind;
  item?: PriceItemView;
  defaultCurrency: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<PriceItemFormInput, unknown, PriceItemData>({
    resolver: zodResolver(priceItemSchema),
    defaultValues: {
      code: item?.code ?? "",
      description: item?.description ?? "",
      listPrice: item?.listPrice ?? "",
      currency: item?.currency ?? defaultCurrency,
      active: item?.active ?? true,
    },
  });
  const { register, formState } = form;
  const e = formState.errors;
  const { onSubmit, pending } = useActionForm(
    form,
    (v) => savePriceItemAction(kind, item?.id ?? null, v),
    {
      onSuccess: () => {
        setOpen(false);
        if (!item) form.reset();
      },
    },
  );
  const priceLabel =
    kind === "subscription"
      ? t.pricing.listPriceAnnual
      : `${t.pricing.listPrice} (${t.pricing.oneShot})`;

  return (
    <EditDialog
      open={open}
      onOpenChange={setOpen}
      title={item ? item.code : t.catalog.new}
      trigger={trigger}
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormField label={t.common.code} htmlFor="pi-code" required error={e.code?.message}>
          <Input id="pi-code" autoCapitalize="characters" {...register("code")} />
        </FormField>
        <FormField
          label={t.common.description}
          htmlFor="pi-desc"
          required
          error={e.description?.message}
        >
          <Input id="pi-desc" {...register("description")} />
        </FormField>
        <div className="grid grid-cols-[1fr_6rem] gap-3">
          <FormField label={priceLabel} htmlFor="pi-price" required error={e.listPrice?.message}>
            <Input
              id="pi-price"
              inputMode="decimal"
              placeholder="0,00"
              {...register("listPrice")}
            />
          </FormField>
          <FormField label={t.proposal.currency} htmlFor="pi-cur" error={e.currency?.message}>
            <Input
              id="pi-cur"
              maxLength={3}
              autoCapitalize="characters"
              {...register("currency")}
            />
          </FormField>
        </div>
        {item && item.usageCount > 0 && (
          <p className="text-muted-foreground text-xs">{t.pricing.catalogSnapshotHint}</p>
        )}
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <Checkbox {...register("active")} /> {t.common.active}
        </label>
        <FormActions pending={pending} sticky={false} onCancel={() => setOpen(false)} />
      </form>
    </EditDialog>
  );
}
