import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/i18n";

/** Carte de tableau de bord : titre, lien « tout voir », liste compacte. */
export function SectionCard({
  title,
  href,
  empty,
  children,
}: {
  title: string;
  href?: string;
  empty?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {href && (
          <Link href={href} className="text-primary text-sm hover:underline">
            {t.common.seeAll}
          </Link>
        )}
      </CardHeader>
      <CardContent className="pt-2">
        {empty ? (
          <p className="text-muted-foreground text-sm">{t.common.emptyList}</p>
        ) : (
          <ul className="divide-y">{children}</ul>
        )}
      </CardContent>
    </Card>
  );
}

export function SectionRow({
  href,
  primary,
  secondary,
  aside,
}: {
  href: string;
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="hover:bg-muted/50 -mx-2 flex min-h-12 items-center justify-between gap-3 rounded-md px-2 py-2"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{primary}</span>
          {secondary && (
            <span className="text-muted-foreground block truncate text-xs">{secondary}</span>
          )}
        </span>
        {aside && (
          <span className="text-muted-foreground shrink-0 text-right text-xs">{aside}</span>
        )}
      </Link>
    </li>
  );
}
