/** Remplace src/lib/db.ts : seul l'accès utilisé par les pages (simulations enregistrées). */
import { getDB } from "../store";

export const prisma = {
  simulation: {
    findMany: async () => JSON.parse(JSON.stringify([...getDB().simulations].sort((a, b) => b.id - a.id))),
  },
};
