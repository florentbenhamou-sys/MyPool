import "server-only";
import { z } from "zod";

/**
 * Configuration serveur, validée au démarrage. Jamais importée côté client :
 * DATABASE_URL et les secrets ne peuvent pas fuiter dans le bundle navigateur.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_TIMEZONE: z.string().default("Europe/Paris"),
  DEFAULT_CURRENCY: z.string().length(3).default("EUR"),
  LOCAL_USER_EMAIL: z
    .string()
    .regex(/^[^@\s]+@[^@\s]+$/)
    .default("moi@localhost"),
  LOCAL_USER_NAME: z.string().default("Utilisateur local"),
  STORAGE_DRIVER: z.enum(["local"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().default("./storage"),
  MAX_UPLOAD_MB: z.coerce.number().positive().max(200).default(20),
});

export type AppConfig = z.infer<typeof schema>;

let cached: AppConfig | null = null;

export function config(): AppConfig {
  if (!cached) cached = schema.parse(process.env);
  return cached;
}
