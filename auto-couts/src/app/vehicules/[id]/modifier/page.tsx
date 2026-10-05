import { notFound } from "next/navigation";
import { loadAppData } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { VehicleForm } from "@/components/VehicleForm";

export const metadata = { title: "Modifier le véhicule" };

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const app = await loadAppData();
  const v = app.rawVehicles.find((x) => x.id === Number(id));
  if (!v) notFound();
  const { createdAt, updatedAt, ...initial } = v;
  return (
    <>
      <PageHeader title={`Modifier « ${v.name} »`} />
      <VehicleForm id={v.id} initial={initial} energies={app.energies} ctx={app.baseCtx} />
    </>
  );
}
