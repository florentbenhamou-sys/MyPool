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
import { ActiveToggle } from "@/components/catalog/active-toggle";
import { EditDialog } from "@/components/catalog/edit-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { FormActions } from "@/components/shared/form-actions";
import { IconButton } from "@/components/shared/row-menu";
import { useActionForm } from "@/components/shared/use-action-form";
import { t } from "@/lib/i18n";
import {
  referenceSchema,
  tagSchema,
  type TagData,
  type TagFormInput,
} from "@/lib/validation/catalog";
import {
  saveReferenceAction,
  saveTagAction,
  setReferenceActiveAction,
  setTagActiveAction,
} from "@/server/actions/catalog";

/**
 * Administration des référentiels. Un même composant gère les tags (avec catégorie)
 * et les référentiels simples (vecteurs de contact, cibles de démo).
 */
export interface ReferenceView {
  id: string;
  code: string;
  label: string;
  category?: string;
  order: number;
  active: boolean;
}

type Kind = "tag" | "channelType" | "demoTarget";

function ReferenceDialog({
  kind,
  item,
  trigger,
}: {
  kind: Kind;
  item?: ReferenceView;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const withCategory = kind === "tag";
  // Le schéma « tag » est un sur-ensemble : la catégorie n'existe pas pour les référentiels simples.
  const form = useForm<TagFormInput, unknown, TagData>({
    resolver: zodResolver(withCategory ? tagSchema : referenceSchema) as never,
    defaultValues: {
      code: item?.code ?? "",
      label: item?.label ?? "",
      category: item?.category ?? "",
      order: String(item?.order ?? 0),
      active: item?.active ?? true,
    },
  });
  const { register, formState } = form;
  const e = formState.errors;
  const { onSubmit, pending } = useActionForm(
    form,
    (v) =>
      kind === "tag"
        ? saveTagAction(item?.id ?? null, v)
        : saveReferenceAction(kind, item?.id ?? null, v),
    {
      onSuccess: () => {
        setOpen(false);
        if (!item) form.reset();
      },
    },
  );
  return (
    <EditDialog
      open={open}
      onOpenChange={setOpen}
      title={item ? item.label : t.common.add}
      trigger={trigger}
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormField label={t.common.code} htmlFor="r-code" required error={e.code?.message}>
          <Input id="r-code" autoCapitalize="characters" {...register("code")} />
        </FormField>
        <FormField label={t.common.label} htmlFor="r-label" required error={e.label?.message}>
          <Input id="r-label" {...register("label")} />
        </FormField>
        {withCategory && (
          <FormField
            label={t.common.category}
            htmlFor="r-cat"
            required
            error={e.category?.message}
            hint="ENVIRONMENT, TARGET…"
          >
            <Input
              id="r-cat"
              autoCapitalize="characters"
              list="tag-categories"
              {...register("category")}
            />
          </FormField>
        )}
        <FormField label={t.common.order} htmlFor="r-order" error={e.order?.message}>
          <Input id="r-order" inputMode="numeric" {...register("order")} />
        </FormField>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <Checkbox {...register("active")} /> {t.common.active}
        </label>
        <FormActions pending={pending} sticky={false} onCancel={() => setOpen(false)} />
      </form>
    </EditDialog>
  );
}

export function ReferenceAdmin({ kind, items }: { kind: Kind; items: ReferenceView[] }) {
  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))] as string[];
  return (
    <div className="flex flex-col gap-3">
      <datalist id="tag-categories">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <div className="flex justify-end">
        <ReferenceDialog
          kind={kind}
          trigger={
            <Button>
              <Plus /> {t.common.add}
            </Button>
          }
        />
      </div>
      {items.length === 0 ? (
        <EmptyState>{t.common.emptyList}</EmptyState>
      ) : (
        <Card className="divide-y">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {item.label}
                  <span className="text-muted-foreground font-mono text-xs">{item.code}</span>
                  {item.category && <Badge variant="secondary">{item.category}</Badge>}
                  {!item.active && <Badge variant="outline">{t.common.inactive}</Badge>}
                </p>
              </div>
              <ActiveToggle
                active={item.active}
                onToggle={(next) =>
                  kind === "tag"
                    ? setTagActiveAction(item.id, next)
                    : setReferenceActiveAction(kind, item.id, next)
                }
              />
              <ReferenceDialog
                kind={kind}
                item={item}
                trigger={
                  <IconButton label={t.common.edit}>
                    <Pencil />
                  </IconButton>
                }
              />
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
