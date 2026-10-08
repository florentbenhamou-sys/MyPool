import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Liste déroulante NATIVE : sur iOS / Android, le sélecteur du système est
 * le plus confortable au doigt (roue / feuille plein écran).
 */
function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative w-full">
      <select
        data-slot="select"
        className={cn(
          "border-input bg-card focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:border-destructive flex h-11 w-full appearance-none rounded-md border py-1 pr-9 pl-3 shadow-xs outline-none focus-visible:ring-2 disabled:opacity-50 md:h-9",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
    </div>
  );
}

export { NativeSelect };
