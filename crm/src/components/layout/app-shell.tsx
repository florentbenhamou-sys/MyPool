"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { t } from "@/lib/i18n";
import { NavLinks } from "./nav-links";
import { SearchBox } from "./search-box";

function Brand() {
  return (
    <Link
      href="/"
      className="text-sidebar-foreground flex h-14 items-center gap-2 px-6 text-base font-semibold"
    >
      <span className="bg-primary text-primary-foreground grid size-7 place-items-center rounded-md text-xs font-bold">
        C
      </span>
      {t.app.name}
    </Link>
  );
}

/**
 * Structure de l'application :
 *  - desktop (≥ lg) : sidebar fixe à gauche ;
 *  - mobile / tablette : barre supérieure + menu hamburger (panneau latéral).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-dvh lg:pl-64">
      <aside className="bg-sidebar fixed inset-y-0 left-0 hidden w-64 flex-col overflow-y-auto lg:flex">
        <Brand />
        <NavLinks />
      </aside>

      <header className="bg-card/95 sticky top-0 z-40 flex h-14 items-center gap-2 border-b px-2 backdrop-blur sm:px-4 lg:px-6">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            className="hover:bg-accent grid size-11 shrink-0 place-items-center rounded-md lg:hidden"
            aria-label={t.nav.menu}
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent className="bg-sidebar text-sidebar-foreground overflow-y-auto">
            <SheetTitle className="sr-only">{t.nav.menu}</SheetTitle>
            <Brand />
            <NavLinks onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <Link href="/" className="shrink-0 text-sm font-semibold lg:hidden">
          {t.app.shortName}
        </Link>
        <Suspense>
          <SearchBox className="ml-auto max-w-md" />
        </Suspense>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-4 pb-24 md:px-6 md:py-6">{children}</main>
    </div>
  );
}
