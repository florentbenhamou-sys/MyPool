"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { FormActions } from "@/components/shared/form-actions";
import { IconButton } from "@/components/shared/row-menu";
import { useActionForm } from "@/components/shared/use-action-form";
import { t } from "@/lib/i18n";
import { productSchema, type ProductData, type ProductFormInput } from "@/lib/validation/catalog";
import { saveProductAction, setProductActiveAction } from "@/server/actions/catalog";
import { ActiveToggle } from "./active-toggle";
import { EditDialog } from "./edit-dialog";

export interface ProductView {
  id: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  usageCount: number;
}

function ProductDialog({ product, trigger }: { product?: ProductView; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const form = useForm<ProductFormInput, unknown, ProductData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      code: product?.code ?? "",
      name: product?.name ?? "",
      description: product?.description ?? "",
      active: product?.active ?? true,
    },
  });
  const { register, formState } = form;
  const e = formState.errors;
  const { onSubmit, pending } = useActionForm(
    form,
    (v) => saveProductAction(product?.id ?? null, v),
    {
      onSuccess: () => {
        setOpen(false);
        if (!product) form.reset();
      },
    },
  );
  return (
    <EditDialog
      open={open}
      onOpenChange={setOpen}
      title={product ? product.name : t.catalog.new}
      trigger={trigger}
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormField label={t.common.code} htmlFor="p-code" required error={e.code?.message}>
          <Input id="p-code" autoCapitalize="characters" {...register("code")} />
        </FormField>
        <FormField label={t.catalog.name} htmlFor="p-name" required error={e.name?.message}>
          <Input id="p-name" {...register("name")} />
        </FormField>
        <FormField label={t.common.description} htmlFor="p-desc">
          <Textarea id="p-desc" rows={4} {...register("description")} />
        </FormField>
        {product && product.usageCount > 0 && (
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

export function ProductsView({ products }: { products: ProductView[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">{t.catalog.deactivateHint}</p>
        <ProductDialog
          trigger={
            <Button>
              <Plus /> {t.common.add}
            </Button>
          }
        />
      </div>
      {products.length === 0 ? (
        <EmptyState>{t.common.emptyList}</EmptyState>
      ) : (
        <Card className="divide-y">
          {products.map((p) => (
            <div key={p.id} className="flex items-start gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {p.name}
                  <span className="text-muted-foreground font-mono text-xs">{p.code}</span>
                  {!p.active && <Badge variant="outline">{t.common.inactive}</Badge>}
                  {p.usageCount > 0 && (
                    <Badge variant="secondary">
                      {p.usageCount} × {t.proposal.plural.toLowerCase()}
                    </Badge>
                  )}
                </p>
                {p.description && (
                  <p className="text-muted-foreground text-sm whitespace-pre-line">
                    {p.description}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center">
                <ActiveToggle
                  active={p.active}
                  onToggle={(next) => setProductActiveAction(p.id, next)}
                />
                <ProductDialog
                  product={p}
                  trigger={
                    <IconButton label={t.common.edit}>
                      <Pencil />
                    </IconButton>
                  }
                />
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
