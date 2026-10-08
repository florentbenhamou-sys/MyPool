/**
 * Briques de validation partagées client / serveur.
 * Les formulaires manipulent des chaînes ; ces schémas les normalisent.
 * Côté serveur, la validation est TOUJOURS rejouée (ne jamais faire confiance au client).
 */
import { z } from "zod";
import { t } from "@/lib/i18n";

const m = t.validation;

export const requiredText = (max = 200) =>
  z.string({ required_error: m.required }).trim().min(1, m.required).max(max, m.tooLong);

/** Texte facultatif : "" → null. */
export const optionalText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max, m.tooLong)
    .optional()
    .transform((v) => (v ? v : null));

/** Texte long (notes, transcript) : 100 000 caractères max. */
export const longText = () => optionalText(100_000);

export const email = () =>
  requiredText(320)
    .pipe(z.string().email(m.email))
    .transform((v) => v.toLowerCase());

export const optionalUrl = () =>
  optionalText(500).refine(
    (v) => v === null || /^https?:\/\/\S+$/i.test(v) || /^[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(v),
    m.url,
  );

export const optionalId = () =>
  z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || z.string().uuid().safeParse(v).success, m.required);

export const requiredId = () => z.string({ required_error: m.required }).uuid(m.required);

export const idList = () => z.array(z.string().uuid()).default([]);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** "yyyy-MM-dd" (champ <input type="date">) */
export const dateInput = () => z.string({ required_error: m.required }).regex(DATE_RE, m.date);
export const optionalDateInput = () =>
  z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || DATE_RE.test(v), m.date);

/** "yyyy-MM-ddTHH:mm" (champ <input type="datetime-local">), interprété dans le fuseau métier. */
export const dateTimeInput = () =>
  z
    .string({ required_error: m.required })
    .transform((v) => v.slice(0, 16))
    .pipe(z.string().regex(DATETIME_RE, m.date));

/** Normalise "1 250,50" → "1250.50" */
const normalizeNumber = (v: string) => v.replace(/[\s  ]/g, "").replace(",", ".");

/** Montant ≥ 0, 2 décimales max, renvoyé sous forme de CHAÎNE (jamais de float). */
export const money = () =>
  z
    .string({ required_error: m.required })
    .transform(normalizeNumber)
    .pipe(
      z
        .string()
        .min(1, m.required)
        .regex(/^\d{1,12}(\.\d{1,2})?$/, m.money),
    );

/** Remise en POURCENTAGE (0..100), 2 décimales max, renvoyée sous forme de chaîne. */
export const percent = () =>
  z
    .string()
    .optional()
    .transform((v) => normalizeNumber(v ?? "") || "0")
    .pipe(
      z
        .string()
        .regex(/^\d{1,3}(\.\d{1,2})?$/, m.percent)
        .refine((v) => Number(v) <= 100, m.percent),
    );

export const optionalPositiveInt = () =>
  z
    .string()
    .optional()
    .transform((v) => (v ? v.trim() : ""))
    .refine((v) => v === "" || /^\d{1,4}$/.test(v), m.integer)
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || v > 0, m.integer);

export const currency = () =>
  z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, m.currency);

export const code = () =>
  requiredText(50)
    .transform((v) => v.toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9_+\-.]+$/, m.code));

export const sortOrder = () =>
  z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 0))
    .pipe(z.number().int(m.integer));
