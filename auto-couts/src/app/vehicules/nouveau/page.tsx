import { loadAppData } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { VehicleForm } from "@/components/VehicleForm";

export const metadata = { title: "Nouveau véhicule" };

export default async function NewVehiclePage() {
  const app = await loadAppData();
  return (
    <>
      <PageHeader title="Nouveau véhicule" subtitle="Les champs s'adaptent au type de véhicule et à la motorisation." />
      <VehicleForm id={null} energies={app.energies} ctx={app.baseCtx} />
    </>
  );
}
