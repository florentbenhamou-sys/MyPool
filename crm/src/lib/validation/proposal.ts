import { z } from "zod";
import {
  currency,
  dateInput,
  longText,
  money,
  optionalDateInput,
  optionalId,
  optionalPositiveInt,
  optionalText,
  percent,
  requiredId,
  requiredText,
} from "./fields";

export const PROPOSAL_STATUSES = [
  "DRAFT",
  "IN_PREPARATION",
  "SENT",
  "NEGOTIATION",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
] as const;
export type ProposalStatusValue = (typeof PROPOSAL_STATUSES)[number];

/** Statuts finaux : la proposition est figée (dupliquer pour la retravailler). */
export const LOCKED_PROPOSAL_STATUSES: readonly ProposalStatusValue[] = [
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
];

export const proposalSchema = z.object({
  entityId: requiredId(),
  creationDate: dateInput(),
  validityDate: optionalDateInput(),
  contractDuration: optionalPositiveInt(),
  status: z.enum(PROPOSAL_STATUSES),
  currency: currency(),
  notes: longText(),
  rfpRfiId: optionalId(),
});
export type ProposalFormInput = z.input<typeof proposalSchema>;
export type ProposalData = z.output<typeof proposalSchema>;

export const addProductSchema = z.object({ productId: requiredId() });

export const scenarioSchema = z.object({
  name: requiredText(100),
  description: optionalText(2000),
});
export type ScenarioFormInput = z.input<typeof scenarioSchema>;
export type ScenarioData = z.output<typeof scenarioSchema>;

/**
 * Ligne issue (ou non) du catalogue : souscription, service, maintenance.
 * Le code / libellé / prix catalogue saisis ici deviennent le SNAPSHOT de la proposition.
 */
export const catalogLineSchema = z.object({
  catalogId: optionalId(),
  code: requiredText(50),
  description: requiredText(500),
  listPrice: money(),
  discount: percent(),
  displayDiscount: z.boolean().default(true),
});
export type CatalogLineFormInput = z.input<typeof catalogLineSchema>;
export type CatalogLineData = z.output<typeof catalogLineSchema>;

/** Option (de service ou additionnelle) : saisie libre. */
export const optionLineSchema = z.object({
  description: requiredText(500),
  listPrice: money(),
  discount: percent(),
  displayDiscount: z.boolean().default(true),
});
export type OptionLineFormInput = z.input<typeof optionLineSchema>;
export type OptionLineData = z.output<typeof optionLineSchema>;

export const LINE_KINDS = [
  "subscription",
  "service",
  "serviceOption",
  "maintenance",
  "additionalOption",
] as const;
export type LineKind = (typeof LINE_KINDS)[number];
