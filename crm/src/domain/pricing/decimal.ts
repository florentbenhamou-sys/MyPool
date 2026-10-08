/**
 * Arithmétique monétaire exacte.
 *
 * Les montants ne sont JAMAIS manipulés en `number` (flottant IEEE 754) :
 * 0.1 + 0.2 !== 0.3. On utilise decimal.js (même bibliothèque que Prisma.Decimal)
 * dans une instance isolée, pour ne pas dépendre de la configuration globale.
 */
import DecimalJs from "decimal.js";

export const Decimal = DecimalJs.clone({ precision: 40, rounding: DecimalJs.ROUND_HALF_UP });
export type Decimal = InstanceType<typeof Decimal>;

/** Valeur acceptée en entrée : chaîne ("1250.50"), entier, Decimal (decimal.js ou Prisma.Decimal). */
export type DecimalInput = string | number | { toString(): string };

/** Nombre de décimales des montants stockés (DECIMAL(14,2)). */
export const MONEY_SCALE = 2;

export function toDecimal(value: DecimalInput | null | undefined): Decimal {
  if (value === null || value === undefined || value === "") return new Decimal(0);
  return new Decimal(typeof value === "number" ? value : value.toString());
}

/** Arrondi commercial (demi supérieur) à 2 décimales. */
export function roundMoney(value: Decimal): Decimal {
  return value.toDecimalPlaces(MONEY_SCALE, Decimal.ROUND_HALF_UP);
}

export function sumDecimals(values: readonly Decimal[]): Decimal {
  return values.reduce<Decimal>((acc, v) => acc.plus(v), new Decimal(0));
}

export const ZERO: Decimal = new Decimal(0);
