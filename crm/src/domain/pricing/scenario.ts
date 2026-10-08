import { ZERO, roundMoney, sumDecimals } from "./decimal";
import type { PricedLine, ScenarioInput, ScenarioSummary } from "./types";

const customerTotal = (lines: readonly PricedLine[]) =>
  sumDecimals(lines.map((l) => l.customerPrice));
const listTotal = (lines: readonly PricedLine[]) => sumDecimals(lines.map((l) => l.listPrice));

/**
 * Synthèse d'un scénario : somme des prix client STOCKÉS de toutes ses lignes.
 *
 * Attention : si le scénario contient plusieurs souscriptions ou plusieurs services
 * pensés comme des alternatives, utiliser generateScenarioCombinations().
 */
export function calculateScenarioSummary(scenario: ScenarioInput): ScenarioSummary {
  const serviceOptions = scenario.services.flatMap((s) => s.options);

  const subscriptionTotal = customerTotal(scenario.subscriptions);
  const serviceTotal = customerTotal(scenario.services);
  const serviceOptionTotal = customerTotal(serviceOptions);
  const maintenanceTotal = customerTotal(scenario.maintenances);
  const additionalOptionTotal = customerTotal(scenario.additionalOptions);

  const annualRecurringTotal = subscriptionTotal;
  const oneShotTotal = serviceTotal
    .plus(serviceOptionTotal)
    .plus(maintenanceTotal)
    .plus(additionalOptionTotal);

  const allLines = [
    ...scenario.subscriptions,
    ...scenario.services,
    ...serviceOptions,
    ...scenario.maintenances,
    ...scenario.additionalOptions,
  ];
  const discountTotal = listTotal(allLines).minus(customerTotal(allLines));

  return {
    scenarioId: scenario.id,
    annualRecurringTotal: roundMoney(annualRecurringTotal),
    oneShotTotal: roundMoney(oneShotTotal),
    firstYearTotal: roundMoney(annualRecurringTotal.plus(oneShotTotal)),
    yearNTotal: roundMoney(annualRecurringTotal),
    subscriptionTotal: roundMoney(subscriptionTotal),
    serviceTotal: roundMoney(serviceTotal),
    serviceOptionTotal: roundMoney(serviceOptionTotal),
    maintenanceTotal: roundMoney(maintenanceTotal),
    additionalOptionTotal: roundMoney(additionalOptionTotal),
    discountTotal: roundMoney(discountTotal.isNegative() ? ZERO : discountTotal),
  };
}

/** Total sur la durée du contrat : one shot + annuel × (mois / 12). */
export function calculateContractTotal(
  annualTotal: ScenarioSummary["annualRecurringTotal"],
  oneShotTotal: ScenarioSummary["oneShotTotal"],
  contractDurationMonths: number,
) {
  return roundMoney(oneShotTotal.plus(annualTotal.times(contractDurationMonths).dividedBy(12)));
}
