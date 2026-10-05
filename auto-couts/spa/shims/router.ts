/** Mini-routeur par ancre (#/chemin?param) : fonctionne en ouvrant le fichier HTML directement. */
import { useSyncExternalStore } from "react";

export interface Loc { pathname: string; search: string; version: number }

function parse(version: number): Loc {
  const h = decodeURI(window.location.hash.slice(1)) || "/";
  const i = h.indexOf("?");
  return { pathname: (i >= 0 ? h.slice(0, i) : h) || "/", search: i >= 0 ? h.slice(i + 1) : "", version };
}

let snapshot: Loc = parse(0);
const listeners = new Set<() => void>();
function emit() {
  snapshot = parse(snapshot.version);
  listeners.forEach((l) => l());
}
window.addEventListener("hashchange", emit);

export function navigate(to: string, opts: { replace?: boolean; scroll?: boolean } = {}) {
  const hash = "#" + to;
  if (opts.replace) {
    history.replaceState(null, "", hash);
    emit();
  } else {
    window.location.hash = to;
  }
  if (opts.scroll !== false && !opts.replace) window.scrollTo(0, 0);
}

export function refresh() {
  snapshot = { ...parse(snapshot.version), version: snapshot.version + 1 };
  listeners.forEach((l) => l());
}

export function useLocation(): Loc {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => snapshot,
  );
}
