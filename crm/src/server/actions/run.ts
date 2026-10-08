import "server-only";
import { ZodError, type ZodType, type ZodTypeDef } from "zod";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { t } from "@/lib/i18n";
import { PricingError } from "@/domain/pricing";
import { getCurrentUserId } from "../context";
import { isForeignKeyViolation, isNotFound, isUniqueViolation } from "../data/prisma-errors";
import { DomainError } from "../errors";

/**
 * Enveloppe commune des Server Actions :
 *  1. valide l'entrée côté serveur (Zod) — ne jamais faire confiance au client ;
 *  2. résout l'utilisateur courant ;
 *  3. traduit les erreurs connues en messages affichables.
 */
export async function runAction<Input, Output, R>(
  schema: ZodType<Output, ZodTypeDef, Input>,
  input: unknown,
  handler: (data: Output, userId: string) => Promise<R>,
): Promise<ActionResult<R>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return fail(
      t.errors.invalidForm,
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    );
  }
  return guard(async () => handler(parsed.data, await getCurrentUserId()));
}

/** Variante sans schéma (actions qui ne prennent qu'un identifiant, validé séparément). */
export async function guard<R>(fn: () => Promise<R>): Promise<ActionResult<R>> {
  try {
    return ok(await fn());
  } catch (error) {
    return fail(errorMessage(error));
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof DomainError) return error.message;
  if (error instanceof ZodError) return t.validation.required;
  if (error instanceof PricingError) return t.validation.percent;
  if (isUniqueViolation(error)) return t.errors.unique;
  if (isForeignKeyViolation(error)) return t.errors.inUse;
  if (isNotFound(error)) return t.common.notFound;
  console.error(error);
  return t.common.unexpectedError;
}
