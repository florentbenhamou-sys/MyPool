import Link from "next/link";
import { Plus } from "lucide-react";

/** Bouton d'action flottant (mobile uniquement) pour la création rapide. */
export function Fab({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="bg-primary text-primary-foreground fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 grid size-14 place-items-center rounded-full shadow-lg md:hidden"
    >
      <Plus className="size-6" />
    </Link>
  );
}
