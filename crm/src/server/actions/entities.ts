"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  contactSchema,
  channelSchema,
  entitySchema,
  quickEntitySchema,
} from "@/lib/validation/crm";
import * as contacts from "../data/contacts";
import * as entities from "../data/entities";
import { getCurrentUserId } from "../context";
import { assertId } from "./ids";
import { guard, runAction } from "./run";

const refresh = () => revalidatePath("/", "layout");

export async function createEntityAction(input: unknown) {
  return runAction(entitySchema, input, async (data, userId) => {
    const entity = await entities.createEntity(data, userId);
    refresh();
    return { id: entity.id };
  });
}

export async function updateEntityAction(id: string, input: unknown) {
  return runAction(entitySchema, input, async (data, userId) => {
    await entities.updateEntity(assertId(id), data, userId);
    refresh();
    return { id };
  });
}

export async function quickCreateEntityAction(input: unknown) {
  return runAction(quickEntitySchema, input, async (data, userId) => {
    const entity = await entities.quickCreateEntity(data, userId);
    refresh();
    return { id: entity.id };
  });
}

export async function deleteEntityAction(id: string) {
  return guard(async () => {
    await entities.deleteEntity(assertId(id), await getCurrentUserId());
    refresh();
  });
}

export async function setEntityArchivedAction(id: string, archived: boolean) {
  return guard(async () => {
    await entities.setEntityArchived(
      assertId(id),
      z.boolean().parse(archived),
      await getCurrentUserId(),
    );
    refresh();
  });
}

// --- Contacts ---

export async function saveContactAction(
  entityId: string,
  contactId: string | null,
  input: unknown,
) {
  return runAction(contactSchema, input, async (data, userId) => {
    const contact = contactId
      ? await contacts.updateContact(assertId(contactId), data, userId)
      : await contacts.createContact(assertId(entityId), data, userId);
    refresh();
    return { id: contact.id };
  });
}

export async function deleteContactAction(id: string) {
  return guard(async () => {
    await contacts.deleteContact(assertId(id));
    refresh();
  });
}

// --- Vecteurs de prise de contact ---

export async function saveChannelAction(
  entityId: string,
  channelId: string | null,
  input: unknown,
) {
  return runAction(channelSchema, input, async (data, userId) => {
    const channel = channelId
      ? await contacts.updateChannel(assertId(channelId), data, userId)
      : await contacts.createChannel(assertId(entityId), data, userId);
    refresh();
    return { id: channel.id };
  });
}

export async function deleteChannelAction(id: string) {
  return guard(async () => {
    await contacts.deleteChannel(assertId(id));
    refresh();
  });
}
