"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fromDateInput, todayInput } from "@/lib/format";
import {
  addProductSchema,
  catalogLineSchema,
  optionLineSchema,
  proposalSchema,
  scenarioSchema,
} from "@/lib/validation/proposal";
import { config } from "../config";
import { getCurrentUserId } from "../context";
import * as proposals from "../data/proposals";
import { assertId } from "./ids";
import { guard, runAction } from "./run";

const refresh = () => revalidatePath("/", "layout");
const catalogKind = z.enum(["subscription", "service", "maintenance"]);
const optionKind = z.enum(["serviceOption", "additionalOption"]);

export async function createProposalAction(input: unknown) {
  return runAction(proposalSchema, input, async (data, userId) => {
    const proposal = await proposals.createProposal(data, userId);
    refresh();
    return { id: proposal.id };
  });
}

export async function updateProposalAction(id: string, input: unknown) {
  return runAction(proposalSchema, input, async (data, userId) => {
    await proposals.updateProposal(assertId(id), data, userId);
    refresh();
    return { id };
  });
}

export async function setProposalArchivedAction(id: string, archived: boolean) {
  return guard(async () => {
    await proposals.setProposalArchived(
      assertId(id),
      z.boolean().parse(archived),
      await getCurrentUserId(),
    );
    refresh();
  });
}

export async function duplicateProposalAction(id: string) {
  return guard(async () => {
    const today = fromDateInput(todayInput(config().APP_TIMEZONE));
    const copy = await proposals.duplicateProposal(assertId(id), await getCurrentUserId(), today);
    refresh();
    return { id: copy.id };
  });
}

// --- Produits & scénarios ---

export async function addProductAction(proposalId: string, input: unknown) {
  return runAction(addProductSchema, input, async (data, userId) => {
    const { result } = await proposals.addProductToProposal(
      assertId(proposalId),
      data.productId,
      userId,
    );
    refresh();
    return { id: result.id, scenarioId: result.scenarios[0]?.id ?? null };
  });
}

export async function removeProductAction(proposalProductId: string) {
  return guard(async () => {
    await proposals.removeProposalProduct(assertId(proposalProductId), await getCurrentUserId());
    refresh();
  });
}

export async function saveScenarioAction(
  target: { proposalProductId: string } | { scenarioId: string },
  input: unknown,
) {
  return runAction(scenarioSchema, input, async (data, userId) => {
    const { result } =
      "scenarioId" in target
        ? await proposals.updateScenario(assertId(target.scenarioId), data, userId)
        : await proposals.addScenario(assertId(target.proposalProductId), data, userId);
    refresh();
    return { id: result.id };
  });
}

export async function deleteScenarioAction(scenarioId: string) {
  return guard(async () => {
    await proposals.deleteScenario(assertId(scenarioId), await getCurrentUserId());
    refresh();
  });
}

export async function selectCombinationAction(scenarioId: string, key: string | null) {
  return guard(async () => {
    const parsedKey = z.string().max(200).nullable().parse(key);
    await proposals.setSelectedCombination(
      assertId(scenarioId),
      parsedKey,
      await getCurrentUserId(),
    );
    refresh();
  });
}

// --- Lignes ---

/** parentId : scenarioId (souscription, service, maintenance, option libre) ou scenarioServiceId (option de service). */
export async function addCatalogLineAction(kind: string, scenarioId: string, input: unknown) {
  return runAction(catalogLineSchema, input, async (data, userId) => {
    await proposals.addCatalogLine(catalogKind.parse(kind), assertId(scenarioId), data, userId);
    refresh();
  });
}

export async function updateCatalogLineAction(kind: string, id: string, input: unknown) {
  return runAction(catalogLineSchema, input, async (data, userId) => {
    await proposals.updateCatalogLine(catalogKind.parse(kind), assertId(id), data, userId);
    refresh();
  });
}

export async function deleteCatalogLineAction(kind: string, id: string) {
  return guard(async () => {
    await proposals.deleteCatalogLine(
      catalogKind.parse(kind),
      assertId(id),
      await getCurrentUserId(),
    );
    refresh();
  });
}

export async function addOptionLineAction(kind: string, parentId: string, input: unknown) {
  return runAction(optionLineSchema, input, async (data, userId) => {
    await proposals.addOptionLine(optionKind.parse(kind), assertId(parentId), data, userId);
    refresh();
  });
}

export async function updateOptionLineAction(kind: string, id: string, input: unknown) {
  return runAction(optionLineSchema, input, async (data, userId) => {
    await proposals.updateOptionLine(optionKind.parse(kind), assertId(id), data, userId);
    refresh();
  });
}

export async function deleteOptionLineAction(kind: string, id: string) {
  return guard(async () => {
    await proposals.deleteOptionLine(
      optionKind.parse(kind),
      assertId(id),
      await getCurrentUserId(),
    );
    refresh();
  });
}
