"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { seriesColor } from "@/lib/colors";

export function ScenarioPicker({ scenarios, selected, baselineId }: { scenarios: { id: number; name: string; color: string }[]; selected: number[]; baselineId: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const update = (ids: number[], ref = baselineId) => {
    const p = new URLSearchParams(params.toString());
    p.set("ids", ids.join(","));
    p.set("ref", String(ids.includes(ref) ? ref : ids[0] ?? ""));
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {scenarios.map((s, i) => {
        const on = selected.includes(s.id);
        return (
          <button
            key={s.id}
            type="button"
            aria-pressed={on}
            onClick={() => update(on ? selected.filter((x) => x !== s.id) : [...selected, s.id])}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${on ? "border-accent bg-accent/10 font-medium" : "border-line text-ink-2"}`}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: seriesColor(s.color, i) }} />
            {s.name}
          </button>
        );
      })}
      {selected.length > 1 && (
        <label className="ml-auto inline-flex items-center gap-2 text-sm text-ink-2">
          Comparer à
          <select className="input !w-auto !py-1.5" value={baselineId} onChange={(e) => update(selected, Number(e.target.value))}>
            {scenarios.filter((s) => selected.includes(s.id)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      )}
    </div>
  );
}
