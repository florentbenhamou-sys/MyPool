"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Search } from "lucide-react";
import { NativeSelect } from "@/components/ui/native-select";
import { Checkbox } from "@/components/ui/checkbox";
import { t } from "@/lib/i18n";

export interface SelectFilter {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  /** Valeur par défaut (non reportée dans l'URL). */
  emptyLabel?: string;
}

/**
 * Barre de filtres pilotée par l'URL (?q=...&status=...) : les listes sont filtrées
 * côté serveur, les filtres sont partageables / bookmarkables.
 */
export function ListFilters({
  selects = [],
  toggle,
  searchPlaceholder = t.common.searchPlaceholder,
}: {
  selects?: SelectFilter[];
  toggle?: { name: string; label: string };
  searchPlaceholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const update = (name: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    startTransition(() => router.replace(`${pathname}?${next.toString()}`));
  };

  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <form
        className="relative sm:w-72"
        onSubmit={(e) => {
          e.preventDefault();
          update("q", String(new FormData(e.currentTarget).get("q") ?? "").trim());
        }}
      >
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <input
          type="search"
          name="q"
          defaultValue={params.get("q") ?? ""}
          placeholder={searchPlaceholder}
          enterKeyHint="search"
          onBlur={(e) => {
            if ((params.get("q") ?? "") !== e.currentTarget.value.trim())
              update("q", e.currentTarget.value.trim());
          }}
          className="border-input bg-card focus-visible:ring-ring/30 h-11 w-full rounded-md border pr-3 pl-9 shadow-xs outline-none focus-visible:ring-2 md:h-9"
        />
      </form>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        {selects.map((s) => (
          <div key={s.name} className="sm:w-48">
            <NativeSelect
              aria-label={s.label}
              value={params.get(s.name) ?? ""}
              onChange={(e) => update(s.name, e.target.value)}
            >
              {s.emptyLabel !== undefined && <option value="">{s.emptyLabel}</option>}
              {s.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
          </div>
        ))}
      </div>
      {toggle && (
        <label className="flex min-h-11 items-center gap-2 text-sm md:min-h-9">
          <Checkbox
            checked={params.get(toggle.name) === "1"}
            onChange={(e) => update(toggle.name, e.target.checked ? "1" : "")}
          />
          {toggle.label}
        </label>
      )}
    </div>
  );
}
