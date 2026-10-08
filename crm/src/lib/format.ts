/**
 * Formatage d'affichage (localisé fr-FR). Aucune logique métier ici.
 *
 * Dates :
 *  - les dates « jour » (colonnes DATE) sont stockées à minuit UTC → formatées en UTC ;
 *  - les dates + heures (TIMESTAMPTZ) sont formatées dans le fuseau métier (APP_TIMEZONE).
 */
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const LOCALE = "fr-FR";
export const DEFAULT_TIMEZONE = "Europe/Paris";

/** Montant : 1 250,00 € (la devise vient de la donnée, pas d'un « EUR » codé en dur). */
export function formatMoney(
  amount: string | number | { toString(): string },
  currency = "EUR",
): string {
  const value = typeof amount === "number" ? amount : amount.toString();
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value as Intl.StringNumericLiteral);
}

export function formatPercent(value: string | number | { toString(): string }): string {
  const n = typeof value === "number" ? value : Number(value.toString());
  return `${new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 }).format(n)} %`;
}

/** 08/10/2026 — pour une colonne DATE. */
export function formatDate(date: Date | null | undefined): string {
  if (!date) return "";
  return formatInTimeZone(date, "UTC", "dd/MM/yyyy");
}

/** 08/10/2026 14:30 — pour une colonne TIMESTAMPTZ. */
export function formatDateTime(date: Date | null | undefined, timeZone: string): string {
  if (!date) return "";
  return formatInTimeZone(date, timeZone, "dd/MM/yyyy HH:mm");
}

// --- Conversions pour les champs de formulaire natifs (<input type="date|datetime-local">) ---

/** DATE → "2026-10-08" */
export function toDateInput(date: Date | null | undefined): string {
  return date ? formatInTimeZone(date, "UTC", "yyyy-MM-dd") : "";
}

/** "2026-10-08" → Date à minuit UTC (colonne DATE). */
export function fromDateInput(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** TIMESTAMPTZ → "2026-10-08T14:30" dans le fuseau métier. */
export function toDateTimeInput(date: Date | null | undefined, timeZone: string): string {
  return date ? formatInTimeZone(date, timeZone, "yyyy-MM-dd'T'HH:mm") : "";
}

/** "2026-10-08T14:30" saisi dans le fuseau métier → instant UTC. */
export function fromDateTimeInput(value: string, timeZone: string): Date {
  return fromZonedTime(value, timeZone);
}

/** Aujourd'hui au format "yyyy-MM-dd" dans le fuseau métier. */
export function todayInput(timeZone: string): string {
  return formatInTimeZone(new Date(), timeZone, "yyyy-MM-dd");
}
