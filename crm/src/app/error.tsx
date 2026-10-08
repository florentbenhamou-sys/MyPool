"use client";

import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="py-16 text-center">
      <h1 className="text-xl font-semibold">{t.common.unexpectedError}</h1>
      <Button className="mt-6" onClick={reset}>
        Réessayer
      </Button>
    </div>
  );
}
