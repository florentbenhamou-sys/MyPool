import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db";

type Tx = Prisma.TransactionClient;

/**
 * Journal d'audit minimal (V1) : créations, archivages et suppressions des objets
 * commerciaux importants. L'historique champ par champ pourra s'appuyer sur `changes`.
 */
export async function recordAudit(
  entry: {
    userId: string | null;
    objectType: string;
    objectId: string;
    action: "CREATE" | "UPDATE" | "DELETE" | "ARCHIVE" | "UNARCHIVE" | "DUPLICATE" | "STATUS";
    changes?: Prisma.InputJsonValue;
  },
  tx: Tx = prisma,
) {
  await tx.auditLog.create({ data: entry });
}
