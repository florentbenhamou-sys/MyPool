"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_GROUPS, isActive } from "./nav-items";

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 px-3 py-2">
      {NAV_GROUPS.map((group, i) => (
        <div
          key={i}
          className={cn("flex flex-col gap-0.5", i > 0 && "mt-3 border-t border-white/10 pt-3")}
        >
          {group.label && (
            <p className="text-sidebar-muted px-3 pb-1 text-xs font-medium tracking-wide uppercase">
              {group.label}
            </p>
          )}
          {group.items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-foreground flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors md:h-9",
                  active && "bg-sidebar-accent text-sidebar-foreground",
                )}
              >
                <item.icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
