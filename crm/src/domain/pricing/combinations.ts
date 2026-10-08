/**
 * Combinaisons d'un scénario.
 *
 * Une combinaison = 1 souscription × 1 « package de services » (un service et ses options),
 * auxquels s'ajoutent les maintenances et options additionnelles du scénario
 * (communes à toutes les combinaisons).
 *
 *   Souscriptions : S1, S2        Packages : [Service1 + Option], [Service2]
 *   →  S1+Service1+Option, S1+Service2, S2+Service1+Option, S2+Service2
 *
 * Les combinaisons sont CALCULÉES (jamais stockées). Leur `key` est stable et
 * permet de mémoriser une combinaison retenue (Scenario.selectedCombinationKey).
 */
import { isCombinationValid, type CombinationValidator } from "./compatibility";
import { roundMoney, sumDecimals } from "./decimal";
import type { CombinationSummary, PricedLine, ScenarioInput, ServicePackage } from "./types";

export function buildServicePackages(scenario: ScenarioInput): ServicePackage[] {
  return scenario.services.map((service) => ({ service, options: service.options }));
}

export function combinationKey(subscriptionId: string | null, serviceId: string | null): string {
  return `sub:${subscriptionId ?? "-"}|svc:${serviceId ?? "-"}`;
}

const total = (lines: readonly PricedLine[]) => sumDecimals(lines.map((l) => l.customerPrice));

function buildCombination(
  scenario: ScenarioInput,
  subscription: PricedLine | null,
  servicePackage: ServicePackage | null,
): CombinationSummary {
  const services = servicePackage ? [servicePackage.service] : [];
  const serviceOptions = servicePackage ? servicePackage.options : [];
  const annualTotal = subscription ? subscription.customerPrice : total([]);
  const oneShotTotal = total([
    ...services,
    ...serviceOptions,
    ...scenario.maintenances,
    ...scenario.additionalOptions,
  ]);
  return {
    key: combinationKey(subscription?.id ?? null, servicePackage?.service.id ?? null),
    subscription,
    services,
    serviceOptions,
    maintenance: scenario.maintenances,
    additionalOptions: scenario.additionalOptions,
    annualTotal: roundMoney(annualTotal),
    oneShotTotal: roundMoney(oneShotTotal),
    firstYearTotal: roundMoney(annualTotal.plus(oneShotTotal)),
  };
}

export interface GenerateCombinationsOptions {
  /** Filtre de compatibilité (V1 : toujours vrai). */
  isValid?: CombinationValidator;
}

/**
 * Produit cartésien souscriptions × packages de services.
 * - sans souscription : une combinaison par package (annuel = 0)
 * - sans service : une combinaison par souscription
 * - scénario sans souscription ni service : une seule combinaison si des
 *   maintenances / options existent, sinon aucune.
 */
export function generateScenarioCombinations(
  scenario: ScenarioInput,
  options: GenerateCombinationsOptions = {},
): CombinationSummary[] {
  const isValid = options.isValid ?? ((c: CombinationSummary) => isCombinationValid(c));
  const subscriptions: (PricedLine | null)[] =
    scenario.subscriptions.length > 0 ? scenario.subscriptions : [null];
  const packages = buildServicePackages(scenario);
  const servicePackages: (ServicePackage | null)[] = packages.length > 0 ? packages : [null];

  const isEmpty =
    scenario.subscriptions.length === 0 &&
    packages.length === 0 &&
    scenario.maintenances.length === 0 &&
    scenario.additionalOptions.length === 0;
  if (isEmpty) return [];

  const combinations: CombinationSummary[] = [];
  for (const subscription of subscriptions) {
    for (const servicePackage of servicePackages) {
      const combination = buildCombination(scenario, subscription, servicePackage);
      if (isValid(combination)) combinations.push(combination);
    }
  }
  return combinations;
}

/** Libellé court d'une combinaison, ex. "S1 + Service 1 + Option". */
export function combinationLabelParts(combination: CombinationSummary): string[] {
  return [
    ...(combination.subscription
      ? [combination.subscription.code || combination.subscription.label]
      : []),
    ...combination.services.map((s) => s.code || s.label),
    ...combination.serviceOptions.map((o) => o.label),
  ];
}
