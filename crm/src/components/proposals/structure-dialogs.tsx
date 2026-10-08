"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { EditDialog } from "@/components/catalog/edit-dialog";
import { FormActions } from "@/components/shared/form-actions";
import { useActionForm } from "@/components/shared/use-action-form";
import { t } from "@/lib/i18n";
import {
  scenarioSchema,
  type ScenarioData,
  type ScenarioFormInput,
} from "@/lib/validation/proposal";
import { addProductAction, saveScenarioAction } from "@/server/actions/proposals";

/** Ajout d'un produit du catalogue (son nom et sa description sont copiés dans la proposition). */
export function AddProductDialog({
  proposalId,
  products,
  trigger,
}: {
  proposalId: string;
  products: { id: string; name: string; code: string }[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <EditDialog open={open} onOpenChange={setOpen} title={t.proposal.addProduct} trigger={trigger}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await addProductAction(proposalId, { productId });
            if (!r.ok) {
              toast.error(r.error);
              return;
            }
            toast.success(t.common.saved);
            setOpen(false);
            setProductId("");
            router.replace(
              `/proposals/${proposalId}?product=${r.data.id}${r.data.scenarioId ? `&scenario=${r.data.scenarioId}` : ""}`,
              {
                scroll: false,
              },
            );
          });
        }}
      >
        <FormField label={t.proposal.product} htmlFor="ap-product" required>
          <NativeSelect
            id="ap-product"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            <option value="">—</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <p className="text-muted-foreground text-xs">{t.pricing.catalogSnapshotHint}</p>
        <div className="flex gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="flex-1 sm:flex-none"
            onClick={() => setOpen(false)}
          >
            {t.common.cancel}
          </Button>
          <Button type="submit" className="flex-1 sm:flex-none" disabled={!productId || pending}>
            {t.common.add}
          </Button>
        </div>
      </form>
    </EditDialog>
  );
}

/** Création / renommage d'un scénario. */
export function ScenarioDialog({
  proposalId,
  proposalProductId,
  scenario,
  trigger,
}: {
  proposalId: string;
  proposalProductId: string;
  scenario?: { id: string; name: string; description: string | null };
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const form = useForm<ScenarioFormInput, unknown, ScenarioData>({
    resolver: zodResolver(scenarioSchema),
    defaultValues: { name: scenario?.name ?? "", description: scenario?.description ?? "" },
  });
  const { register, formState } = form;
  const { onSubmit, pending } = useActionForm(
    form,
    (v) => saveScenarioAction(scenario ? { scenarioId: scenario.id } : { proposalProductId }, v),
    {
      onSuccess: ({ id }) => {
        setOpen(false);
        if (!scenario) {
          form.reset();
          router.replace(`/proposals/${proposalId}?product=${proposalProductId}&scenario=${id}`, {
            scroll: false,
          });
        }
      },
    },
  );
  return (
    <EditDialog
      open={open}
      onOpenChange={setOpen}
      title={scenario ? scenario.name : t.proposal.addScenario}
      trigger={trigger}
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormField
          label={t.catalog.name}
          htmlFor="sc-name"
          required
          error={formState.errors.name?.message}
        >
          <Input id="sc-name" placeholder="Standard, Premium, Enterprise…" {...register("name")} />
        </FormField>
        <FormField label={t.common.description} htmlFor="sc-desc">
          <Textarea id="sc-desc" rows={3} {...register("description")} />
        </FormField>
        <FormActions pending={pending} sticky={false} onCancel={() => setOpen(false)} />
      </form>
    </EditDialog>
  );
}
