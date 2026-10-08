import { z } from "zod";
import { code, currency, money, optionalText, requiredText, sortOrder } from "./fields";

export const productSchema = z.object({
  code: code(),
  name: requiredText(200),
  description: optionalText(5000),
  active: z.boolean().default(true),
});
export type ProductFormInput = z.input<typeof productSchema>;
export type ProductData = z.output<typeof productSchema>;

/** Souscription (prix annuel), Service et Maintenance (prix one shot) partagent la même forme. */
export const priceItemSchema = z.object({
  code: code(),
  description: requiredText(500),
  listPrice: money(),
  currency: currency(),
  active: z.boolean().default(true),
});
export type PriceItemFormInput = z.input<typeof priceItemSchema>;
export type PriceItemData = z.output<typeof priceItemSchema>;

export const tagSchema = z.object({
  code: code(),
  label: requiredText(100),
  category: code(),
  active: z.boolean().default(true),
  order: sortOrder(),
});
export type TagFormInput = z.input<typeof tagSchema>;
export type TagData = z.output<typeof tagSchema>;

/** Référentiel simple (vecteurs de contact, cibles de démo). */
export const referenceSchema = z.object({
  code: code(),
  label: requiredText(100),
  active: z.boolean().default(true),
  order: sortOrder(),
});
export type ReferenceFormInput = z.input<typeof referenceSchema>;
export type ReferenceData = z.output<typeof referenceSchema>;
