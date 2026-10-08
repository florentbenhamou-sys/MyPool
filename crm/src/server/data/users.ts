import "server-only";
import { prisma } from "../db";

export async function ensureLocalUser(email: string, name: string) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name },
  });
}

export function listUsers() {
  return prisma.user.findMany({ orderBy: { name: "asc" } });
}
