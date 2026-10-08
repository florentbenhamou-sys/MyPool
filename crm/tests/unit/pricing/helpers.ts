import {
  computeCustomerPrice,
  toDecimal,
  type PricedLine,
  type ScenarioInput,
  type ServiceLine,
} from "@/domain/pricing";

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${++seq}`;

/** Ligne de test : le prix client est calculé comme le ferait l'application à l'enregistrement. */
export function line(
  code: string,
  listPrice: string | number,
  discount: string | number = 0,
): PricedLine {
  return {
    id: nextId(code),
    code,
    label: code,
    listPrice: toDecimal(listPrice),
    discount: toDecimal(discount),
    customerPrice: computeCustomerPrice(listPrice, discount),
  };
}

export function service(
  code: string,
  listPrice: string | number,
  options: PricedLine[] = [],
  discount: string | number = 0,
): ServiceLine {
  return { ...line(code, listPrice, discount), options };
}

export function scenario(parts: Partial<Omit<ScenarioInput, "id">> = {}): ScenarioInput {
  return {
    id: nextId("scenario"),
    name: "Standard",
    subscriptions: [],
    services: [],
    maintenances: [],
    additionalOptions: [],
    ...parts,
  };
}

/** Compare un Decimal à une valeur attendue, sous forme de chaîne à 2 décimales. */
export const money = (d: { toFixed(n: number): string }) => d.toFixed(2);
