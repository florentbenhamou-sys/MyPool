import { loadAppData } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { BackupCard, EnergyPricesForm, GeneralSettingsForm } from "@/components/SettingsForms";

export const metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const app = await loadAppData();
  const used = Array.from(new Set(app.rawVehicles.flatMap((v) => [v.fuelEnergyCode ?? ""]).filter(Boolean)));
  return (
    <>
      <PageHeader title="Paramètres" />
      <div className="grid xl:grid-cols-2 gap-4 items-start">
        <EnergyPricesForm energies={app.energies} usedCodes={used} />
        <div className="space-y-4">
          <GeneralSettingsForm settings={app.settings} scenarios={app.rawScenarios.map((s) => ({ id: s.id, name: s.name }))} />
          <BackupCard />
        </div>
      </div>
    </>
  );
}
