import Link from "next/link";
import { cn } from "@/lib/utils";

/** Navigation entre éléments (produits ou scénarios) par liens : état dans l'URL, partageable. */
export function LinkTabs({
  items,
  activeId,
}: {
  items: { id: string; href: string; label: React.ReactNode; sub?: React.ReactNode }[];
  activeId: string | undefined;
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <div className="bg-muted inline-flex min-w-max gap-1 rounded-lg p-1">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            scroll={false}
            aria-current={item.id === activeId ? "page" : undefined}
            className={cn(
              "text-muted-foreground hover:text-foreground flex min-h-10 flex-col justify-center rounded-md px-3 py-1 text-sm whitespace-nowrap transition-colors",
              item.id === activeId && "bg-card text-foreground font-medium shadow-sm",
            )}
          >
            <span>{item.label}</span>
            {item.sub && <span className="text-muted-foreground text-xs">{item.sub}</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
