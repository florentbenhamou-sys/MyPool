/**
 * Règles de compatibilité entre éléments d'un scénario — POINT D'EXTENSION.
 *
 * V1 : aucune règle n'est appliquée, toutes les combinaisons sont valides.
 *
 * Évolutions prévues (modélisées ci-dessous mais non évaluées) :
 *  - souscription incompatible avec un service
 *  - service obligatoire avec une souscription
 *  - option disponible uniquement avec un service
 *  - options mutuellement exclusives
 *  - maintenance / service obligatoire
 *
 * Les règles référenceront des ids de CATALOGUE (subscriptionId, serviceId...),
 * de sorte qu'elles s'appliquent à toutes les propositions.
 */
import type { CombinationSummary } from "./types";

export type CompatibilityRule =
  | { kind: "SUBSCRIPTION_EXCLUDES_SERVICE"; subscriptionId: string; serviceId: string }
  | { kind: "SUBSCRIPTION_REQUIRES_SERVICE"; subscriptionId: string; serviceId: string }
  | { kind: "OPTION_REQUIRES_SERVICE"; optionId: string; serviceId: string }
  | { kind: "OPTIONS_MUTUALLY_EXCLUSIVE"; optionIds: [string, string] }
  | { kind: "MAINTENANCE_REQUIRED" }
  | { kind: "SERVICE_REQUIRED" };

export type CombinationValidator = (combination: CombinationSummary) => boolean;

export function isCombinationValid(
  _combination: CombinationSummary,
  _rules: readonly CompatibilityRule[] = [],
): boolean {
  return true;
}
