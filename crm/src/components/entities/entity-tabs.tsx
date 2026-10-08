"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Onglets de la fiche entité, synchronisés avec ?tab= (retour au bon onglet après une création). */
export function EntityTabs({
  tabs,
  defaultTab,
  children,
}: {
  tabs: { value: string; label: string; count?: number }[];
  defaultTab: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("tab") ?? defaultTab;
  return (
    <Tabs
      value={current}
      onValueChange={(v) => {
        const next = new URLSearchParams(params.toString());
        next.set("tab", v);
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      }}
    >
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
            {tab.count !== undefined && (
              <span className="bg-muted-foreground/15 rounded px-1.5 text-xs tabular-nums">
                {tab.count}
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  );
}
