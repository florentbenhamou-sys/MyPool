"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { EditDialog } from "@/components/catalog/edit-dialog";
import { FormActions } from "@/components/shared/form-actions";
import { useActionForm } from "@/components/shared/use-action-form";
import { t } from "@/lib/i18n";
import {
  catalogLineSchema,
  type CatalogLineData,
  type CatalogLineFormInput,
} from "@/lib/validation/proposal";
import { addCatalogLineAction, updateCatalogLineAction } from "@/server/actions/proposals";
import { PricePreview } from "./price-preview";
import type { CatalogKind, CatalogOption, LineView } from "./types";

const TITLES: Record<CatalogKind, string> = {
  subscription: t.pricing.addSubscription,
  service: t.pricing.addService,
  maintenance: t.pricing.addMaintenance,
};

/**
 * Ajout / modification d'une souscription, d'un service ou d'une maintenance.
 * Depuis le catalogue : code et prix catalogue sont copiés (snapshot) et non modifiables.
 */
export function CatalogLineDialog({
  kind,
  scenarioId,
  line,
  catalog,
  currency,
  trigger,
}: {
  kind: CatalogKind;
  scenarioId: string;
  line?: LineView;
  catalog: CatalogOption[];
  currency: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(line);
  const form = useForm<CatalogLineFormInput, unknown, CatalogLineData>({
    resolver: zodResolver(catalogLineSchema),
    defaultValues: {
      catalogId: "",
      code: line?.code ?? "",
      description: line?.description ?? "",
      listPrice: line?.listPrice ?? "",
      discount: line ? line.discount : "0",
      displayDiscount: line?.displayDiscount ?? true,
    },
  });
  const { register, formState, watch, setValue } = form;
  const e = formState.errors;
  const catalogId = watch("catalogId");
  const frozen = (isEdit && line?.fromCatalog) || Boolean(catalogId);
  const { onSubmit, pending } = useActionForm(
    form,
    (v) =>
      line ? updateCatalogLineAction(kind, line.id, v) : addCatalogLineAction(kind, scenarioId, v),
    {
      onSuccess: () => {
        setOpen(false);
        if (!line) form.reset();
      },
    },
  );

  const pick = (id: string) => {
    setValue("catalogId", id);
    const item = catalog.find((c) => c.id === id);
    if (item) {
      setValue("code", item.code, { shouldValidate: true });
      setValue("description", item.description, { shouldValidate: true });
      setValue("listPrice", item.listPrice, { shouldValidate: true });
    }
  };

  return (
    <EditDialog
      open={open}
      onOpenChange={setOpen}
      title={line ? line.description : TITLES[kind]}
      trigger={trigger}
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {!isEdit && (
          <FormField label={t.pricing.fromCatalog} htmlFor="cl-catalog">
            <NativeSelect
              id="cl-catalog"
              value={catalogId ?? ""}
              onChange={(ev) => pick(ev.target.value)}
            >
              <option value="">{t.pricing.freeEntry}</option>
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.description}
                </option>
              ))}
            </NativeSelect>
          </FormField>
        )}
        <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
          <FormField label={t.common.code} htmlFor="cl-code" required error={e.code?.message}>
            <Input
              id="cl-code"
              readOnly={frozen}
              className={frozen ? "bg-muted" : undefined}
              {...register("code")}
            />
          </FormField>
          <FormField
            label={t.common.description}
            htmlFor="cl-desc"
            required
            error={e.description?.message}
          >
            <Input id="cl-desc" {...register("description")} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label={kind === "subscription" ? t.pricing.listPriceAnnual : t.pricing.listPrice}
            htmlFor="cl-price"
            required
            error={e.listPrice?.message}
          >
            <Input
              id="cl-price"
              inputMode="decimal"
              readOnly={frozen}
              className={frozen ? "bg-muted" : undefined}
              {...register("listPrice")}
            />
          </FormField>
          <FormField label={t.pricing.discount} htmlFor="cl-disc" error={e.discount?.message}>
            <Input id="cl-disc" inputMode="decimal" {...register("discount")} />
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
        {frozen && <p className="text-muted-foreground text-xs">{t.pricing.catalogSnapshotHint}</p>}
        <FormActions pending={pending} sticky={false} onCancel={() => setOpen(false)} />
      </form>
    </EditDialog>
  );
}
