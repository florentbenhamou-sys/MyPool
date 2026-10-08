import "server-only";
import { isUniqueViolation } from "./prisma-errors";

/**
 * Exécute une création qui attribue un compteur « max + 1 » par entité
 * (Meeting #n, Demo #n, RFP #n). La contrainte UNIQUE(entityId, counter) garantit
 * l'unicité ; en cas de création concurrente, on recommence.
 */
export async function withCounterRetry<T>(create: () => Promise<T>, attempts = 5): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await create();
    } catch (error) {
      if (i >= attempts || !isUniqueViolation(error)) throw error;
    }
  }
}

export function nextCounter(current: { _max: { counter: number | null } }): number {
  return (current._max.counter ?? 0) + 1;
}
