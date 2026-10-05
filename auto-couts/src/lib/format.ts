/** Formatage français partagé (moteur de calcul + interface). */

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2, minimumFractionDigits: 2 });
const eur0 = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eur3 = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 3, maximumFractionDigits: 3 });

export function fmtEur(v: number | null | undefined, digits: 0 | 2 | 3 = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const f = digits === 0 ? eur0 : digits === 3 ? eur3 : eur;
  // évite "-0,00 €"
  return f.format(Math.abs(v) < 0.0005 ? 0 : v);
}

export function fmtNum(v: number | null | undefined, maxDigits = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: maxDigits }).format(v);
}

export function fmtKm(v: number | null | undefined): string {
  return v === null || v === undefined ? "—" : `${fmtNum(v, 0)} km`;
}

export function fmtPct(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(v)} %`;
}

export function fmtYears(y: number): string {
  return `${fmtNum(y, 1)} an${y > 1 ? "s" : ""}`;
}
