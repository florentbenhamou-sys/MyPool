import Link from "next/link";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-xl font-semibold">{t.common.notFound}</h1>
      <Button asChild className="mt-6">
        <Link href="/">{t.nav.dashboard}</Link>
      </Button>
    </div>
  );
}
