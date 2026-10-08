import { generateScenarioCombinations, type GenerateCombinationsOptions } from "./combinations";
import { calculateScenarioSummary } from "./scenario";
import type {
  Alternative,
  ProductInput,
  ProductSummary,
  Range,
  ScenarioResult,
  Totals,
} from "./types";

export function buildScenarioResult(
  scenario: ProductInput["scenarios"][number],
  options?: GenerateCombinationsOptions,
): ScenarioResult {
  const combinations = generateScenarioCombinations(scenario, options);
  const selectedCombination =
    combinations.find((c) => c.key === scenario.selectedCombinationKey) ?? null;
  return {
    scenarioId: scenario.id,
    name: scenario.name,
    summary: calculateScenarioSummary(scenario),
    combinations,
    hasAlternatives: combinations.length > 1,
    selectedCombination,
  };
}

/**
 * Alternatives d'un scénario :
 *  - la combinaison retenue si elle existe,
 *  - sinon chaque combinaison si le scénario en a plusieurs,
 *  - sinon le scénario lui-même.
 */
export function scenarioAlternatives(result: ScenarioResult): Alternative[] {
  if (result.selectedCombination) {
    const c = result.selectedCombination;
    return [{ scenarioId: result.scenarioId, combinationKey: c.key, ...pickTotals(c) }];
  }
  if (result.hasAlternatives) {
    return result.combinations.map((c) => ({
      scenarioId: result.scenarioId,
      combinationKey: c.key,
      ...pickTotals(c),
    }));
  }
  const s = result.summary;
  return [
    {
      scenarioId: result.scenarioId,
      combinationKey: result.combinations[0]?.key ?? null,
      annualTotal: s.annualRecurringTotal,
      oneShotTotal: s.oneShotTotal,
      firstYearTotal: s.firstYearTotal,
    },
  ];
}

function pickTotals(t: Totals): Totals {
  return {
    annualTotal: t.annualTotal,
    oneShotTotal: t.oneShotTotal,
    firstYearTotal: t.firstYearTotal,
  };
}

/** Fourchette min / max des alternatives, classées par total année 1. */
export function computeRange(alternatives: readonly Totals[]): Range | null {
  const first = alternatives[0];
  if (!first) return null;
  let min = first;
  let max = first;
  for (const alt of alternatives) {
    if (alt.firstYearTotal.lessThan(min.firstYearTotal)) min = alt;
    if (alt.firstYearTotal.greaterThan(max.firstYearTotal)) max = alt;
  }
  return { min: pickTotals(min), max: pickTotals(max) };
}

/** Synthèse d'un produit de proposition : scénarios (alternatives) et combinaisons. */
export function calculateProductSummary(
  product: ProductInput,
  options?: GenerateCombinationsOptions,
): ProductSummary {
  const scenarios = product.scenarios.map((s) => buildScenarioResult(s, options));
  const alternatives = scenarios.flatMap(scenarioAlternatives);
  return {
    productId: product.id,
    name: product.name,
    scenarios,
    alternatives,
    range: computeRange(alternatives),
  };
}
