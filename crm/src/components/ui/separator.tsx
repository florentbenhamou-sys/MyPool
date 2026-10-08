import { cn } from "@/lib/utils";

function Separator({ className }: { className?: string }) {
  return <div role="separator" className={cn("bg-border h-px w-full shrink-0", className)} />;
}

export { Separator };
