import { z } from "zod";
import { t } from "@/lib/i18n";
import {
  dateInput,
  dateTimeInput,
  email,
  idList,
  longText,
  optionalDateInput,
  optionalId,
  optionalText,
  optionalUrl,
  requiredId,
  requiredText,
} from "./fields";

export const ENTITY_STATUSES = ["PROSPECT", "CLIENT"] as const;
export const MEETING_TYPES = ["MEETING", "PRESENTATION"] as const;
export const RFP_RFI_TYPES = ["RFP", "RFI"] as const;

export const entitySchema = z.object({
  name: requiredText(200),
  status: z.enum(ENTITY_STATUSES),
  communicationLanguage: optionalText(10),
  website: optionalUrl(),
  addressLine1: optionalText(),
  addressLine2: optionalText(),
  postalCode: optionalText(20),
  city: optionalText(100),
  country: optionalText(100),
  notes: longText(),
  tagIds: idList(),
});
export type EntityFormInput = z.input<typeof entitySchema>;
export type EntityData = z.output<typeof entitySchema>;

export const contactSchema = z.object({
  firstName: requiredText(100),
  lastName: requiredText(100),
  email: email(),
  phone: optionalText(50),
  role: optionalText(100),
  notes: longText(),
  active: z.boolean().default(true),
});
export type ContactFormInput = z.input<typeof contactSchema>;
export type ContactData = z.output<typeof contactSchema>;

export const channelSchema = z.object({
  typeId: requiredId(),
  contactId: optionalId(),
  eventName: optionalText(200),
  contactDate: dateInput(),
  notes: longText(),
});
export type ChannelFormInput = z.input<typeof channelSchema>;
export type ChannelData = z.output<typeof channelSchema>;

/**
 * Saisie rapide (cas d'usage « salon ») : entité + premier contact + vecteur + note,
 * enregistrés en une seule transaction.
 */
export const quickEntitySchema = z
  .object({
    name: requiredText(200),
    status: z.enum(ENTITY_STATUSES),
    contactFirstName: optionalText(100),
    contactLastName: optionalText(100),
    contactEmail: optionalText(320),
    contactPhone: optionalText(50),
    contactRole: optionalText(100),
    channelTypeId: optionalId(),
    eventName: optionalText(200),
    contactDate: dateInput(),
    notes: longText(),
  })
  .superRefine((v, ctx) => {
    const hasContact = Boolean(
      v.contactFirstName || v.contactLastName || v.contactEmail || v.contactPhone || v.contactRole,
    );
    if (!hasContact) return;
    if (!v.contactFirstName)
      ctx.addIssue({ code: "custom", path: ["contactFirstName"], message: t.validation.required });
    if (!v.contactLastName)
      ctx.addIssue({ code: "custom", path: ["contactLastName"], message: t.validation.required });
    if (!v.contactEmail)
      ctx.addIssue({ code: "custom", path: ["contactEmail"], message: t.validation.required });
    else if (!z.string().email().safeParse(v.contactEmail).success)
      ctx.addIssue({ code: "custom", path: ["contactEmail"], message: t.validation.email });
  });
export type QuickEntityFormInput = z.input<typeof quickEntitySchema>;
export type QuickEntityData = z.output<typeof quickEntitySchema>;

export const meetingSchema = z.object({
  entityId: requiredId(),
  type: z.enum(MEETING_TYPES),
  title: requiredText(200),
  meetingDate: dateTimeInput(),
  demoTargetId: optionalId(),
  notes: longText(),
  transcript: longText(),
  nextSteps: longText(),
  contactIds: idList(),
  tagIds: idList(),
});
export type MeetingFormInput = z.input<typeof meetingSchema>;
export type MeetingData = z.output<typeof meetingSchema>;

export const demoSchema = z.object({
  entityId: requiredId(),
  meetingId: optionalId(),
  title: requiredText(200),
  demoDate: dateTimeInput(),
  notes: longText(),
  transcript: longText(),
  nextSteps: longText(),
  targetIds: idList(),
  tagIds: idList(),
});
export type DemoFormInput = z.input<typeof demoSchema>;
export type DemoData = z.output<typeof demoSchema>;

export const rfpRfiSchema = z.object({
  entityId: requiredId(),
  type: z.enum(RFP_RFI_TYPES),
  title: requiredText(200),
  contactDate: dateInput(),
  responseDate: optionalDateInput(),
  presentationDate: optionalDateInput(),
  notes: longText(),
});
export type RfpRfiFormInput = z.input<typeof rfpRfiSchema>;
export type RfpRfiData = z.output<typeof rfpRfiSchema>;
