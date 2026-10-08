import { z } from "zod";

const uuid = z.string().uuid();

/** Valide un identifiant reçu du client (lève une ZodError sinon). */
export function assertId(id: unknown): string {
  return uuid.parse(id);
}
