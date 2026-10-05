/** Charge les données de démonstration si la base est vide (premier lancement). */
import { PrismaClient } from "@prisma/client";
import { importBackup } from "../src/lib/backup";
import { demoData } from "./demo-data";

const prisma = new PrismaClient();

async function main() {
  const force = process.argv.includes("--force");
  const [energies, vehicles] = await Promise.all([prisma.energyType.count(), prisma.vehicle.count()]);
  if (!force && (energies > 0 || vehicles > 0)) {
    console.log("Base existante conservée (pas de données de démonstration ajoutées).");
    return;
  }
  const r = await importBackup(prisma, demoData);
  console.log(`Données de démonstration chargées : ${r.vehicles} véhicules, ${r.scenarios} scénarios.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
