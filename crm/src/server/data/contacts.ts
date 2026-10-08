import "server-only";
import { fromDateInput } from "@/lib/format";
import type { ChannelData, ContactData } from "@/lib/validation/crm";
import { prisma } from "../db";

export function createContact(entityId: string, data: ContactData, userId: string) {
  return prisma.contact.create({
    data: { ...data, entityId, createdById: userId, updatedById: userId },
  });
}

export function updateContact(id: string, data: ContactData, userId: string) {
  return prisma.contact.update({ where: { id }, data: { ...data, updatedById: userId } });
}

export function deleteContact(id: string) {
  return prisma.contact.delete({ where: { id } });
}

export function listContactsOfEntity(entityId: string) {
  return prisma.contact.findMany({
    where: { entityId },
    orderBy: [{ active: "desc" }, { lastName: "asc" }],
    select: { id: true, firstName: true, lastName: true, active: true },
  });
}

const channelColumns = (data: ChannelData) => ({
  typeId: data.typeId,
  contactId: data.contactId,
  eventName: data.eventName,
  contactDate: fromDateInput(data.contactDate),
  notes: data.notes,
});

export function createChannel(entityId: string, data: ChannelData, userId: string) {
  return prisma.contactChannel.create({
    data: { ...channelColumns(data), entityId, createdById: userId, updatedById: userId },
  });
}

export function updateChannel(id: string, data: ChannelData, userId: string) {
  return prisma.contactChannel.update({
    where: { id },
    data: { ...channelColumns(data), updatedById: userId },
  });
}

export function deleteChannel(id: string) {
  return prisma.contactChannel.delete({ where: { id } });
}
