"use client";

import { useTransition } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/action-result";
import { t } from "@/lib/i18n";

/**
 * Relie un formulaire React Hook Form à une Server Action :
 * - valide côté client (zodResolver) puis appelle l'action (qui revalide côté serveur) ;
 * - reporte les erreurs de champ renvoyées par le serveur ;
 * - affiche un message de confirmation explicite.
 */
export function useActionForm<TValues extends FieldValues, TOutput, TResult>(
  form: UseFormReturn<TValues, unknown, TOutput>,
  action: (values: TValues) => Promise<ActionResult<TResult>>,
  options: { successMessage?: string; onSuccess?: (data: TResult) => void } = {},
) {
  const [pending, startTransition] = useTransition();
  // On envoie les valeurs BRUTES du formulaire (form.getValues()) : le serveur applique
  // lui-même le schéma Zod (transformations comprises) — validation serveur obligatoire.
  const onSubmit = form.handleSubmit(
    () =>
      new Promise<void>((resolve) =>
        startTransition(async () => {
          const result = await action(form.getValues());
          if (!result.ok) {
            for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
              if (messages?.[0]) form.setError(field as Path<TValues>, { message: messages[0] });
            }
            toast.error(result.error);
          } else {
            toast.success(options.successMessage ?? t.common.saved);
            options.onSuccess?.(result.data);
          }
          resolve();
        }),
      ),
  );
  return { onSubmit, pending: pending || form.formState.isSubmitting };
}
