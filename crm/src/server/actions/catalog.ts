"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  priceItemSchema,
  productSchema,
  referenceSchema,
  tagSchema,
} from "@/lib/validation/catalog";
import * as catalog from "../data/catalog";
import * as references from "../data/references";
import { assertId } from "./ids";
import { guard, runAction } from "./run";

const refresh = () => revalidatePath("/", "layout");
const priceKind = z.enum(["subscription", "service", "maintenance"]);
const referenceKind = z.enum(["channelType", "demoTarget"]);
const optionalId = (id: string | null) => (id ? assertId(id) : null);

export async function saveProductAction(id: string | null, input: unknown) {
  return runAction(productSchema, input, async (data) => {
    const product = id
      ? await catalog.updateProduct(assertId(id), data)
      : await catalog.createProduct(data);
    refresh();
    return { id: product.id };
  });
}

export async function setProductActiveAction(id: string, active: boolean) {
  return guard(async () => {
    await catalog.setProductActive(assertId(id), z.boolean().parse(active));
    refresh();
  });
}

export async function savePriceItemAction(kind: string, id: string | null, input: unknown) {
  return runAction(priceItemSchema, input, async (data) => {
    const item = await catalog.savePriceCatalogItem(priceKind.parse(kind), optionalId(id), data);
    refresh();
    return { id: item.id };
  });
}

export async function setPriceItemActiveAction(kind: string, id: string, active: boolean) {
  return guard(async () => {
    await catalog.setPriceCatalogItemActive(
      priceKind.parse(kind),
      assertId(id),
      z.boolean().parse(active),
    );
    refresh();
  });
}

export async function saveTagAction(id: string | null, input: unknown) {
  return runAction(tagSchema, input, async (data) => {
    const tag = await references.saveTag(optionalId(id), data);
    refresh();
    return { id: tag.id };
  });
}

export async function setTagActiveAction(id: string, active: boolean) {
  return guard(async () => {
    await references.setTagActive(assertId(id), z.boolean().parse(active));
    refresh();
  });
}

export async function saveReferenceAction(kind: string, id: string | null, input: unknown) {
  return runAction(referenceSchema, input, async (data) => {
    const ref = await references.saveReference(referenceKind.parse(kind), optionalId(id), data);
    refresh();
    return { id: ref.id };
  });
}

export async function setReferenceActiveAction(kind: string, id: string, active: boolean) {
  return guard(async () => {
    await references.setReferenceActive(
      referenceKind.parse(kind),
      assertId(id),
      z.boolean().parse(active),
    );
    refresh();
  });
}
