import "server-only";
import { notFound } from "next/navigation";
import { formatDateTime, fromDateInput, toDateTimeInput, todayInput } from "@/lib/format";
import { config } from "./config";
import { NotFoundError } from "./errors";
import { isInvalidInput } from "./data/prisma-errors";

/** Helpers pour les Server Components (pages). */

export async function orNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof NotFoundError || isInvalidInput(error)) notFound();
    throw error;
  }
}

export const appTimeZone = () => config().APP_TIMEZONE;
export const defaultCurrency = () => config().DEFAULT_CURRENCY;

/** 08/10/2026 14:30 dans le fuseau métier. */
export const fmtDateTime = (d: Date | null | undefined) => formatDateTime(d, appTimeZone());

/** Valeur pour <input type="datetime-local"> dans le fuseau métier. */
export const dateTimeInputValue = (d: Date | null | undefined) => toDateTimeInput(d, appTimeZone());

/** Aujourd'hui ("yyyy-MM-dd") et aujourd'hui en tant que DATE (minuit UTC). */
export const todayValue = () => todayInput(appTimeZone());
export const todayDate = () => fromDateInput(todayValue());

/** Valeur par défaut d'un nouveau meeting : aujourd'hui, heure ronde suivante. */
export function nextHourInputValue(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return dateTimeInputValue(d);
}

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function param(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v?.trim() || undefined;
}

/** Valeur d'énumération sûre issue de l'URL. */
export function enumParam<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[],
): T | undefined {
  const v = param(value);
  return v && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
}
