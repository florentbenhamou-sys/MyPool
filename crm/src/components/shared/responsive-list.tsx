import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "./empty-state";
import { t } from "@/lib/i18n";

/**
 * Liste responsive : tableau sur desktop (≥ md), cartes empilées sur mobile.
 * Aucune page n'impose de défilement horizontal sur téléphone.
 */
export function ResponsiveList<T>({
  items,
  getKey,
  getHref,
  table,
  card,
  empty = t.common.emptyList,
}: {
  items: T[];
  getKey: (item: T) => string;
  getHref: (item: T) => string;
  /** Rendu desktop : en-têtes + rangées */
  table: { head: React.ReactNode; row: (item: T) => React.ReactNode };
  /** Rendu mobile : contenu d'une carte */
  card: (item: T) => React.ReactNode;
  empty?: React.ReactNode;
}) {
  if (items.length === 0) return <EmptyState>{empty}</EmptyState>;
  return (
    <>
      <Card className="hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground border-b text-left text-xs tracking-wide uppercase [&_th]:h-10 [&_th]:px-3 [&_th]:font-medium">
              {table.head}
            </thead>
            <tbody className="[&_td]:px-3 [&_td]:py-2.5 [&_tr]:border-b [&_tr:last-child]:border-0">
              {items.map((item) => (
                <tr key={getKey(item)} className="hover:bg-muted/40">
                  {table.row(item)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <ul className="flex flex-col gap-2 md:hidden">
        {items.map((item) => (
          <li key={getKey(item)}>
            <Link
              href={getHref(item)}
              className="bg-card active:bg-muted/50 flex items-center gap-3 rounded-lg border p-3 shadow-xs"
            >
              <div className="min-w-0 flex-1">{card(item)}</div>
              <ChevronRight className="text-muted-foreground size-4 shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Lien principal d'une rangée de tableau. */
export function RowLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="hover:text-primary font-medium hover:underline">
      {children}
    </Link>
  );
}
