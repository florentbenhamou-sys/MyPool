import "server-only";
import { listContactsOfEntity } from "./data/contacts";
import { listEntityOptions } from "./data/entities";
import { listReferences, listTags } from "./data/references";

/** Options des formulaires (listes issues de la base, jamais codées en dur). */

export async function tagOptions() {
  return (await listTags()).map((tag) => ({
    value: tag.id,
    label: tag.label,
    group: tag.category,
  }));
}

export async function demoTargetOptions() {
  return (await listReferences("demoTarget")).map((d) => ({ value: d.id, label: d.label }));
}

export async function contactChipOptions(entityId: string) {
  return (await listContactsOfEntity(entityId)).map((c) => ({
    value: c.id,
    label: `${c.firstName} ${c.lastName}${c.active ? "" : " (inactif)"}`,
  }));
}

export async function entityPickerOptions() {
  return (await listEntityOptions()).map((e) => ({ id: e.id, name: e.name }));
}
