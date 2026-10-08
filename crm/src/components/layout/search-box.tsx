"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Recherche globale (soumet vers /search). */
export function SearchBox({ className }: { className?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  return (
    <form
      role="search"
      className={cn("relative w-full", className)}
      onSubmit={(e) => {
        e.preventDefault();
        const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
        router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
      }}
    >
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <input
        type="search"
        name="q"
        defaultValue={params.get("q") ?? ""}
        placeholder={t.common.searchPlaceholder}
        aria-label={t.nav.search}
        enterKeyHint="search"
        className="border-input bg-card focus-visible:border-ring focus-visible:ring-ring/30 h-10 w-full rounded-md border pr-3 pl-9 shadow-xs outline-none focus-visible:ring-2 md:h-9"
      />
    </form>
  );
}
