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
  PROPOSAL_STATUSES,
  proposalSchema,
  type ProposalData,
  type ProposalFormInput,
} from "@/lib/validation/proposal";
import { createProposalAction, updateProposalAction } from "@/server/actions/proposals";

export function ProposalForm({
  proposalId,
  defaultValues,
  rfps,
}: {
  proposalId?: string;
  defaultValues: ProposalFormInput;
  rfps: { id: string; label: string }[];
}) {
  const router = useRouter();
  const form = useForm<ProposalFormInput, unknown, ProposalData>({
    resolver: zodResolver(proposalSchema),
    defaultValues,
  });
  const { register, formState } = form;
  const e = formState.errors;
  const { onSubmit, pending } = useActionForm(
    form,
    (v) => (proposalId ? updateProposalAction(proposalId, v) : createProposalAction(v)),
    { onSuccess: ({ id }) => router.push(`/proposals/${id}`) },
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-3xl flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label={t.proposal.status} htmlFor="p-status">
          <NativeSelect id="p-status" {...register("status")}>
            {PROPOSAL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t.enums.proposalStatus[s]}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label={t.proposal.rfp} htmlFor="p-rfp">
          <NativeSelect id="p-rfp" {...register("rfpRfiId")}>
            <option value="">—</option>
            {rfps.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField
          label={t.proposal.creationDate}
          htmlFor="p-date"
          required
          error={e.creationDate?.message}
        >
          <Input id="p-date" type="date" {...register("creationDate")} />
        </FormField>
        <FormField
          label={t.proposal.validityDate}
          htmlFor="p-valid"
          error={e.validityDate?.message}
        >
          <Input id="p-valid" type="date" {...register("validityDate")} />
        </FormField>
        <FormField
          label={t.proposal.contractDuration}
          htmlFor="p-dur"
          error={e.contractDuration?.message}
        >
          <Input
            id="p-dur"
            inputMode="numeric"
            placeholder="36"
            {...register("contractDuration")}
          />
        </FormField>
        <FormField label={t.proposal.currency} htmlFor="p-cur" error={e.currency?.message}>
          <Input id="p-cur" maxLength={3} autoCapitalize="characters" {...register("currency")} />
        </FormField>
      </div>
      <FormField label={t.common.notes} htmlFor="p-notes">
        <Textarea id="p-notes" rows={4} {...register("notes")} />
      </FormField>
      <FormActions pending={pending} />
    </form>
  );
}
