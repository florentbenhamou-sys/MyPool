import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";
import { t } from "@/lib/i18n";

/** Liste simple de liens (sections de la fiche entité). */
export function LinkList({
  items,
  newHref,
  newLabel,
}: {
  items: {
    id: string;
    href: string;
    primary: React.ReactNode;
    secondary?: React.ReactNode;
    aside?: React.ReactNode;
  }[];
  newHref?: string;
  newLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {newHref && (
        <div className="flex justify-end">
          <Button asChild>
            <Link href={newHref}>
              <Plus /> {newLabel}
            </Link>
          </Button>
        </div>
      )}
      {items.length === 0 ? (
        <EmptyState>{t.common.emptyList}</EmptyState>
      ) : (
        <ul className="bg-card divide-y rounded-lg border">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="hover:bg-muted/40 flex min-h-14 items-center justify-between gap-3 px-3 py-2.5"
              >
                <span className="min-w-0">
                  <span className="block font-medium break-words">{item.primary}</span>
                  {item.secondary && (
                    <span className="text-muted-foreground block text-sm">{item.secondary}</span>
                  )}
                </span>
                {item.aside && <span className="shrink-0 text-right text-sm">{item.aside}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
