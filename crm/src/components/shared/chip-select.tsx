"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChipOption {
  value: string;
  label: string;
  group?: string;
}

/**
 * Sélection multiple par « puces » : bien plus utilisable au doigt qu'un <select multiple>.
 * Les options viennent de la base (tags, cibles, contacts) — rien n'est codé en dur.
 */
export function ChipSelect({
  options,
  value,
  onChange,
  emptyLabel,
}: {
  options: ChipOption[];
  value: string[];
  onChange: (value: string[]) => void;
  emptyLabel?: string;
}) {
  if (options.length === 0)
    return <p className="text-muted-foreground text-sm">{emptyLabel ?? "—"}</p>;
  const groups = [...new Set(options.map((o) => o.group ?? ""))];
  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div className="flex flex-col gap-2">
      {groups.map((group) => (
        <div key={group} className="flex flex-col gap-1.5">
          {group && <p className="text-muted-foreground text-xs font-medium">{group}</p>}
          <div className="flex flex-wrap gap-2">
            {options
              .filter((o) => (o.group ?? "") === group)
              .map((o) => {
                const selected = value.includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggle(o.value)}
                    className={cn(
                      "inline-flex h-10 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors md:h-8",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-card hover:bg-accent",
                    )}
                  >
                    {selected && <Check className="size-3.5" />}
                    {o.label}
                  </button>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
