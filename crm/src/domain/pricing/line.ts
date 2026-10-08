/**
 * Règle de prix d'une ligne.
 *
 * IMPORTANT : `discount` est un POURCENTAGE (0 à 100), pas un montant.
 *   customerPrice = listPrice × (1 − discount / 100), arrondi à 2 décimales.
 *   Exemple : listPrice = 1000, discount = 20  →  customerPrice = 800.
 */
import { Decimal, type DecimalInput, roundMoney, toDecimal } from "./decimal";

export class PricingError extends Error {
  constructor(
    public readonly code: "NEGATIVE_LIST_PRICE" | "DISCOUNT_OUT_OF_RANGE",
    message: string,
  ) {
    super(message);
    this.name = "PricingError";
  }
}

export const MIN_DISCOUNT_PERCENT = 0;
export const MAX_DISCOUNT_PERCENT = 100;

export function computeCustomerPrice(
  listPrice: DecimalInput,
  discountPercent: DecimalInput,
): Decimal {
  const price = toDecimal(listPrice);
  const discount = toDecimal(discountPercent);
  if (price.isNegative()) {
    throw new PricingError("NEGATIVE_LIST_PRICE", "listPrice must be >= 0");
  }
  if (discount.lessThan(MIN_DISCOUNT_PERCENT) || discount.greaterThan(MAX_DISCOUNT_PERCENT)) {
    throw new PricingError(
      "DISCOUNT_OUT_OF_RANGE",
      "discount must be a percentage between 0 and 100",
    );
  }
  const factor = new Decimal(1).minus(discount.dividedBy(100));
  return roundMoney(price.times(factor));
}

/** Montant de la remise (listPrice − customerPrice). */
export function computeDiscountAmount(
  listPrice: DecimalInput,
  customerPrice: DecimalInput,
): Decimal {
  return roundMoney(toDecimal(listPrice).minus(toDecimal(customerPrice)));
}
