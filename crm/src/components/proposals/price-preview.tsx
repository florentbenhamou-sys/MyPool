"use client";

import { computeCustomerPrice } from "@/domain/pricing";
import { formatMoney } from "@/lib/format";
import { t } from "@/lib/i18n";

const normalize = (v: string) => v.replace(/[\s  ]/g, "").replace(",", ".");

/**
 * Aperçu du prix client pendant la saisie. Le calcul vient du module métier
 * (src/domain/pricing) ; le serveur refait le calcul à l'enregistrement.
 */
export function PricePreview({
  listPrice,
  discount,
  currency,
}: {
  listPrice: string;
  discount: string;
  currency: string;
}) {
  let value: string | null = null;
  try {
    const lp = normalize(listPrice || "0");
    const d = normalize(discount || "0");
    if (/^\d+(\.\d+)?$/.test(lp) && /^\d+(\.\d+)?$/.test(d))
      value = computeCustomerPrice(lp, d).toFixed(2);
  } catch {
    value = null;
  }
  return (
    <div className="bg-muted flex items-center justify-between rounded-md px-3 py-2.5 text-sm">
      <span className="text-muted-foreground">{t.pricing.customerPrice}</span>
      <span className="money text-base font-semibold">
        {value === null ? "—" : formatMoney(value, currency)}
      </span>
    </div>
  );
}
