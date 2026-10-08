import { cn } from "@/lib/utils";

export function EmptyState({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}
