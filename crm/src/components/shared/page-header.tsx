import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  back,
  actions,
  badges,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
  badges?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 md:mb-6">
      {back && (
        <Link
          href={back.href}
          className="text-muted-foreground hover:text-foreground -ml-1 inline-flex w-fit items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold break-words md:text-2xl">{title}</h1>
          {badges && <div className="mt-2 flex flex-wrap gap-1.5">{badges}</div>}
          {subtitle && <div className="text-muted-foreground mt-1 text-sm">{subtitle}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
