import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Money({
  value,
  currency = "EUR",
  className,
}: {
  value: string | { toString(): string };
  currency?: string;
  className?: string;
}) {
  return <span className={cn("money", className)}>{formatMoney(value, currency)}</span>;
}
