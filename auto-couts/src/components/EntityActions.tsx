"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteScenario, deleteVehicle, duplicateScenario, duplicateVehicle, setReferenceScenario } from "@/app/actions";

export function VehicleActions({ id, name, usedIn }: { id: number; name: string; usedIn: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <>
      <Link href={`/vehicules/${id}/modifier`} className="btn btn-primary">Modifier</Link>
      <button className="btn" disabled={pending} onClick={() => start(async () => { const r = await duplicateVehicle(id); if (r.ok) router.push(`/vehicules/${r.data!.id}/modifier`); })}>Dupliquer</button>
      <button
        className="btn btn-danger"
        disabled={pending}
        onClick={() => {
          const msg = usedIn.length ? `« ${name} » est utilisé dans : ${usedIn.join(", ")}.\nIl en sera retiré. Supprimer ?` : `Supprimer « ${name} » ?`;
          if (confirm(msg)) start(async () => { await deleteVehicle(id); router.push("/vehicules"); });
        }}
      >
        Supprimer
      </button>
    </>
  );
}

export function ScenarioActions({ id, name, isReference }: { id: number; name: string; isReference: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <>
      <Link href={`/scenarios/${id}/modifier`} className="btn btn-primary">Modifier</Link>
      {!isReference && <button className="btn" disabled={pending} onClick={() => start(async () => { await setReferenceScenario(id); router.refresh(); })}>Définir comme référence</button>}
      <button className="btn" disabled={pending} onClick={() => start(async () => { const r = await duplicateScenario(id); if (r.ok) router.push(`/scenarios/${r.data!.id}/modifier`); })}>Dupliquer</button>
      <button className="btn btn-danger" disabled={pending} onClick={() => { if (confirm(`Supprimer le scénario « ${name} » ? (les véhicules sont conservés)`)) start(async () => { await deleteScenario(id); router.push("/scenarios"); }); }}>Supprimer</button>
    </>
  );
}
