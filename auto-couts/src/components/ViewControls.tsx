"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { METHOD_DESCRIPTIONS, METHOD_LABELS, STANDARD_HORIZONS, type CostMethod } from "@/lib/domain";

/** Choix de la méthode de coût et de l'horizon (stockés dans l'URL, sans modifier les paramètres). */
export function ViewControls({ method, horizon }: { method: CostMethod; horizon: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params.toString());
    p.set(k, v);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <div className="inline-flex rounded-lg border border-line bg-surface p-0.5" role="group" aria-label="Méthode de calcul">
        {(["ECONOMIC", "CASH"] as const).map((m) => (
          <button
            key={m}
            type="button"
            title={METHOD_DESCRIPTIONS[m]}
            onClick={() => set("methode", m)}
            aria-pressed={method === m}
            className={`rounded-md px-3 py-1.5 ${method === m ? "bg-accent text-white font-medium" : "text-ink-2 hover:bg-surface-2"}`}
          >
            {METHOD_LABELS[m]}
          </button>
        ))}
      </div>
      <label className="inline-flex items-center gap-2 text-ink-2">
        Horizon
        <select className="input !w-auto !py-1.5" value={horizon} onChange={(e) => set("horizon", e.target.value)}>
          {Array.from(new Set([...STANDARD_HORIZONS, horizon])).sort((a, b) => a - b).map((h) => (
            <option key={h} value={h}>
              {h} an{h > 1 ? "s" : ""}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
