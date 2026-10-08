import { fr, type Messages } from "./fr";

export type { Messages };

/** Langue de l'interface. V1 : français uniquement. */
export const t: Messages = fr;

/** Remplace {name} dans un message. */
export function interpolate(message: string, values: Record<string, string | number>): string {
  return message.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));
}
