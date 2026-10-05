/** Remplace next/navigation pour la version fichier HTML. */
import { useMemo } from "react";
import { navigate, refresh, useLocation } from "./router";

export class NotFoundError extends Error {}

export function notFound(): never {
  throw new NotFoundError("not found");
}

export function useRouter() {
  return useMemo(
    () => ({
      push: (href: string) => navigate(href),
      replace: (href: string, opts?: { scroll?: boolean }) => navigate(href, { replace: true, scroll: opts?.scroll }),
      back: () => history.back(),
      refresh,
    }),
    [],
  );
}

export function usePathname() {
  return useLocation().pathname;
}

export function useSearchParams() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}
