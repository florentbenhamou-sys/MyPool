"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard", icon: "M3 12l9-8 9 8M5 10v10h14V10" },
  { href: "/vehicules", label: "Véhicules", icon: "M5 16h14M6 16l1.5-5h9L18 16M7 19a1 1 0 100-2 1 1 0 000 2zm10 0a1 1 0 100-2 1 1 0 000 2z" },
  { href: "/scenarios", label: "Scénarios", icon: "M4 6h16M4 12h10M4 18h7" },
  { href: "/comparaison", label: "Comparaison", icon: "M6 20V10m6 10V4m6 16v-7" },
  { href: "/simulations", label: "Simulations", icon: "M4 17l5-5 4 4 7-8" },
  { href: "/parametres", label: "Paramètres", icon: "M12 15a3 3 0 100-6 3 3 0 000 6zM19 12l2-1-1-3-2 .5-1.5-1.5L17 5l-3-1-1 2h-2L10 4 7 5l.5 2L6 8.5 4 8l-1 3 2 1v0l-2 1 1 3 2-.5 1.5 1.5L7 19l3 1 1-2h2l1 2 3-1-.5-2 1.5-1.5 2 .5 1-3-2-1z" },
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function Nav() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <>
      {/* Barre latérale (≥ md) */}
      <aside className="hidden md:flex md:flex-col w-56 shrink-0 min-h-screen border-r border-line bg-surface px-3 py-6 sticky top-0">
        <Link href="/" className="px-3 mb-8 block">
          <div className="text-lg font-semibold">Auto Coûts</div>
          <div className="text-xs text-muted">Coûts automobiles du foyer</div>
        </Link>
        <nav className="flex flex-col gap-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${active(l.href) ? "bg-surface-2 font-semibold text-ink" : "text-ink-2 hover:bg-surface-2"}`}
            >
              <Icon d={l.icon} />
              {l.label}
            </Link>
          ))}
        </nav>
      </aside>
      {/* Barre de navigation inférieure (mobile) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 grid grid-cols-6 border-t border-line bg-surface">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={`flex flex-col items-center gap-0.5 py-2 text-[10px] ${active(l.href) ? "text-accent font-semibold" : "text-muted"}`}>
            <Icon d={l.icon} />
            <span className="truncate max-w-full px-0.5">{l.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
