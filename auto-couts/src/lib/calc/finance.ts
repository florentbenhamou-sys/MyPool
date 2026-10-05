/** Fonctions financières pures (crédit amortissable à mensualités constantes). */

/** Mensualité d'un crédit amortissable. Taux annuel nominal en %. */
export function annuityPayment(principal: number, annualRatePct: number, months: number): number {
  if (months <= 0) throw new Error("La durée du crédit doit être > 0");
  if (principal <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

export interface AmortizationState {
  interestPaid: number;
  principalPaid: number;
  paymentsMade: number;
  balance: number;
}

/**
 * État du crédit après `upToMonth` mensualités (bornées à la durée du crédit).
 * La dernière mensualité solde exactement le capital restant.
 */
export function amortizationAt(
  principal: number,
  annualRatePct: number,
  months: number,
  payment: number,
  upToMonth: number,
): AmortizationState {
  const r = annualRatePct / 100 / 12;
  let balance = principal;
  let interestPaid = 0;
  let paymentsMade = 0;
  const n = Math.min(Math.max(0, Math.floor(upToMonth)), months);
  for (let m = 1; m <= n; m++) {
    const interest = balance * r;
    let p = payment;
    if (m === months || balance + interest < p) p = balance + interest; // solde final
    balance = balance + interest - p;
    interestPaid += interest;
    paymentsMade += p;
    if (balance < 1e-9) balance = 0;
  }
  return { interestPaid, principalPaid: paymentsMade - interestPaid, paymentsMade, balance };
}

/**
 * Taux annuel (%) implicite d'un crédit à partir de la mensualité (dichotomie).
 * Retourne null si la mensualité ne rembourse même pas le capital.
 */
export function impliedAnnualRate(principal: number, payment: number, months: number): number | null {
  if (principal <= 0 || months <= 0) return null;
  if (payment * months < principal - 1e-6) return null;
  if (Math.abs(payment * months - principal) < 1e-6) return 0;
  let lo = 0;
  let hi = 100;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (annuityPayment(principal, mid, months) > payment) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}
