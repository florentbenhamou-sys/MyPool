import * as React from "react";
import { cn } from "@/lib/utils";

/** Case à cocher native, agrandie pour le tactile. */
function Checkbox({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  return (
    <input
      type="checkbox"
      data-slot="checkbox"
      className={cn(
        "border-input accent-primary size-5 shrink-0 cursor-pointer rounded md:size-4",
        className,
      )}
      {...props}
    />
  );
}

export { Checkbox };
