"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { FormActions } from "@/components/shared/form-actions";
import { useActionForm } from "@/components/shared/use-action-form";
import { t } from "@/lib/i18n";
import { contactSchema, type ContactData, type ContactFormInput } from "@/lib/validation/crm";
import { saveContactAction } from "@/server/actions/entities";

export interface ContactView {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string | null;
  notes: string | null;
  active: boolean;
}

export function ContactDialog({
  entityId,
  contact,
  trigger,
}: {
  entityId: string;
  contact?: ContactView;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<ContactFormInput, unknown, ContactData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      firstName: contact?.firstName ?? "",
      lastName: contact?.lastName ?? "",
      email: contact?.email ?? "",
      phone: contact?.phone ?? "",
      role: contact?.role ?? "",
      notes: contact?.notes ?? "",
      active: contact?.active ?? true,
    },
  });
  const { register, formState } = form;
  const e = formState.errors;
  const { onSubmit, pending } = useActionForm(
    form,
    (values) => saveContactAction(entityId, contact?.id ?? null, values),
    {
      onSuccess: () => {
        setOpen(false);
        if (!contact) form.reset();
      },
    },
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {contact ? `${contact.firstName} ${contact.lastName}` : t.contact.new}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label={t.contact.firstName}
              htmlFor="c-fn"
              required
              error={e.firstName?.message}
            >
              <Input
                id="c-fn"
                autoComplete="given-name"
                autoCapitalize="words"
                {...register("firstName")}
              />
            </FormField>
            <FormField
              label={t.contact.lastName}
              htmlFor="c-ln"
              required
              error={e.lastName?.message}
            >
              <Input
                id="c-ln"
                autoComplete="family-name"
                autoCapitalize="words"
                {...register("lastName")}
              />
            </FormField>
          </div>
          <FormField label={t.contact.email} htmlFor="c-em" required error={e.email?.message}>
            <Input
              id="c-em"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoComplete="email"
              {...register("email")}
            />
          </FormField>
          <FormField label={t.contact.phone} htmlFor="c-ph">
            <Input id="c-ph" type="tel" inputMode="tel" autoComplete="tel" {...register("phone")} />
          </FormField>
          <FormField label={t.contact.role} htmlFor="c-role">
            <Input id="c-role" {...register("role")} />
          </FormField>
          <FormField label={t.common.notes} htmlFor="c-notes">
            <Textarea id="c-notes" rows={3} {...register("notes")} />
          </FormField>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <Checkbox {...register("active")} />
            {t.common.active}
          </label>
          <FormActions pending={pending} sticky={false} onCancel={() => setOpen(false)} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
