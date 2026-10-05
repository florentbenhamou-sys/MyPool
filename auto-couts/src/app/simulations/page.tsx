import Link from "next/link";
import { loadAppData } from "@/lib/data";
import { prisma } from "@/lib/db";
import { Empty, PageHeader } from "@/components/ui";
import { SimulationPanel } from "@/components/SimulationPanel";

export const metadata = { title: "Simulations" };

export default async function SimulationsPage() {
  const [app, saved] = await Promise.all([loadAppData(), prisma.simulation.findMany({ orderBy: { createdAt: "desc" } })]);
  return (
    <>
      <PageHeader title="Simulations « Et si… »" subtitle="Modifiez des hypothèses et voyez l'effet immédiat sur chaque scénario, sans toucher aux données enregistrées." />
      {app.scenarios.length === 0 ? (
        <Empty>Créez d&apos;abord un <Link href="/scenarios/nouveau" className="text-accent underline">scénario</Link>.</Empty>
      ) : (
        <SimulationPanel
          vehicles={app.vehicles}
          scenarios={app.scenarios}
          energies={app.energies}
          baseCtx={app.baseCtx}
          referenceId={app.referenceScenarioId}
          saved={saved.map((s) => ({ id: s.id, name: s.name, params: s.params }))}
        />
      )}
    </>
  );
}
