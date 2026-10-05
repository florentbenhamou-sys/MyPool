import { loadAppData } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { ScenarioForm } from "@/components/ScenarioForm";

export const metadata = { title: "Nouveau scénario" };

export default async function NewScenarioPage() {
  const app = await loadAppData();
  return (
    <>
      <PageHeader title="Nouveau scénario" subtitle="Sélectionnez les véhicules de cette configuration." />
      <ScenarioForm id={null} usedColors={app.rawScenarios.map((s) => s.color.toLowerCase())} vehicles={app.vehicles} energies={app.energies} ctx={app.baseCtx} />
    </>
  );
}
