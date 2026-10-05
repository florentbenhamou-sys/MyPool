import { StrictMode, useEffect, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { Nav } from "@/components/Nav";
import Dashboard from "@/app/page";
import VehiclesPage from "@/app/vehicules/page";
import NewVehiclePage from "@/app/vehicules/nouveau/page";
import VehiclePage from "@/app/vehicules/[id]/page";
import EditVehiclePage from "@/app/vehicules/[id]/modifier/page";
import ScenariosPage from "@/app/scenarios/page";
import NewScenarioPage from "@/app/scenarios/nouveau/page";
import ScenarioPage from "@/app/scenarios/[id]/page";
import EditScenarioPage from "@/app/scenarios/[id]/modifier/page";
import ComparisonPage from "@/app/comparaison/page";
import SimulationsPage from "@/app/simulations/page";
import SettingsPage from "@/app/parametres/page";
import { NotFoundError } from "./shims/next-navigation";
import { useLocation } from "./shims/router";
import { runExport } from "./exports";
import { storageOk, getDB } from "./store";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PageFn = (props: any) => Promise<ReactNode> | ReactNode;

const ROUTES: [RegExp, PageFn, string][] = [
  [/^\/$/, Dashboard as PageFn, "Tableau de bord"],
  [/^\/vehicules$/, VehiclesPage as PageFn, "Véhicules"],
  [/^\/vehicules\/nouveau$/, NewVehiclePage as PageFn, "Nouveau véhicule"],
  [/^\/vehicules\/(?<id>\d+)$/, VehiclePage as PageFn, "Véhicule"],
  [/^\/vehicules\/(?<id>\d+)\/modifier$/, EditVehiclePage as PageFn, "Modifier le véhicule"],
  [/^\/scenarios$/, ScenariosPage as PageFn, "Scénarios"],
  [/^\/scenarios\/nouveau$/, NewScenarioPage as PageFn, "Nouveau scénario"],
  [/^\/scenarios\/(?<id>\d+)$/, ScenarioPage as PageFn, "Scénario"],
  [/^\/scenarios\/(?<id>\d+)\/modifier$/, EditScenarioPage as PageFn, "Modifier le scénario"],
  [/^\/comparaison$/, ComparisonPage as PageFn, "Comparaison"],
  [/^\/simulations$/, SimulationsPage as PageFn, "Simulations"],
  [/^\/parametres$/, SettingsPage as PageFn, "Paramètres"],
];

const NotFound = () => (
  <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-2">
    Page introuvable. <a href="#/" className="text-accent underline">Retour au tableau de bord</a>
  </div>
);

function App() {
  const loc = useLocation();
  const [page, setPage] = useState<ReactNode>(null);

  useEffect(() => {
    let cancelled = false;
    const route = ROUTES.find(([re]) => re.test(loc.pathname));
    if (!route) {
      setPage(<NotFound />);
      return;
    }
    const [re, fn, title] = route;
    const params = (loc.pathname.match(re)?.groups ?? {}) as Record<string, string>;
    const sp = Object.fromEntries(new URLSearchParams(loc.search));
    document.title = `${title} · Auto Coûts`;
    Promise.resolve()
      .then(() => fn({ params: Promise.resolve(params), searchParams: Promise.resolve(sp) }))
      .then((el) => !cancelled && setPage(el))
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof NotFoundError) setPage(<NotFound />);
        else {
          console.error(e);
          setPage(<div className="text-bad text-sm">Erreur : {String(e?.message ?? e)}</div>);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loc]);

  return (
    <div className="md:flex">
      <Nav />
      <main className="flex-1 min-w-0 px-4 py-5 md:px-8 md:py-8 pb-24 md:pb-8 max-w-7xl">
        {!storageOk && (
          <div className="mb-4 rounded-xl bg-warn-bg text-warn-ink p-3 text-sm">
            Le navigateur n&apos;autorise pas l&apos;enregistrement local : vos modifications seront perdues à la fermeture. Exportez-les en JSON (Paramètres).
          </div>
        )}
        {page}
      </main>
    </div>
  );
}

// Les liens « /api/export?... » (Paramètres) déclenchent un téléchargement généré localement
document.addEventListener(
  "click",
  (e) => {
    const a = (e.target as HTMLElement).closest?.("a[href^='/api/export']") as HTMLAnchorElement | null;
    if (!a) return;
    e.preventDefault();
    const format = new URL(a.getAttribute("href")!, "http://x").searchParams.get("format") ?? "json";
    void runExport(format);
  },
  true,
);

getDB();
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
