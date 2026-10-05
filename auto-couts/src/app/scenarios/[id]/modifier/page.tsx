import { notFound } from "next/navigation";
import { loadAppData } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { ScenarioForm } from "@/components/ScenarioForm";

export const metadata = { title: "Modifier le scénario" };

export default async function EditScenarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const app = await loadAppData();
  const s = app.rawScenarios.find((x) => x.id === Number(id));
  if (!s) notFound();
  return (
    <>
      <PageHeader title={`Modifier « ${s.name} »`} />
      <ScenarioForm
        id={s.id}
        initial={{
          name: s.name, description: s.description, color: s.color, adults: s.adults, children: s.children,
          needsTwoCarsSimultaneously: s.needsTwoCarsSimultaneously,
          vehicles: s.vehicles.map((v) => ({ vehicleId: v.vehicleId, annualKmOverride: v.annualKmOverride })),
          priceOverrides: s.priceOverrides.map((p) => ({ energyCode: p.energyCode, price: p.price })),
        }}
        vehicles={app.vehicles}
        energies={app.energies}
        ctx={app.baseCtx}
      />
    </>
  );
}
