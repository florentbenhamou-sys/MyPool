"use server";

import { revalidatePath } from "next/cache";
import { demoSchema, meetingSchema, rfpRfiSchema } from "@/lib/validation/crm";
import * as demos from "../data/demos";
import * as meetings from "../data/meetings";
import * as rfps from "../data/rfps";
import { assertId } from "./ids";
import { guard, runAction } from "./run";

const refresh = () => revalidatePath("/", "layout");

// --- Meetings ---

export async function saveMeetingAction(id: string | null, input: unknown) {
  return runAction(meetingSchema, input, async (data, userId) => {
    const meeting = id
      ? await meetings.updateMeeting(assertId(id), data, userId)
      : await meetings.createMeeting(data, userId);
    refresh();
    return { id: meeting.id };
  });
}

export async function deleteMeetingAction(id: string) {
  return guard(async () => {
    await meetings.deleteMeeting(assertId(id));
    refresh();
  });
}

// --- Démos ---

export async function saveDemoAction(id: string | null, input: unknown) {
  return runAction(demoSchema, input, async (data, userId) => {
    const demo = id
      ? await demos.updateDemo(assertId(id), data, userId)
      : await demos.createDemo(data, userId);
    refresh();
    return { id: demo.id };
  });
}

export async function deleteDemoAction(id: string) {
  return guard(async () => {
    await demos.deleteDemo(assertId(id));
    refresh();
  });
}

// --- RFP / RFI ---

export async function saveRfpAction(id: string | null, input: unknown) {
  return runAction(rfpRfiSchema, input, async (data, userId) => {
    const rfp = id
      ? await rfps.updateRfp(assertId(id), data, userId)
      : await rfps.createRfp(data, userId);
    refresh();
    return { id: rfp.id };
  });
}

export async function deleteRfpAction(id: string) {
  return guard(async () => {
    await rfps.deleteRfp(assertId(id));
    refresh();
  });
}

export async function deleteRfpFileAction(id: string) {
  return guard(async () => {
    await rfps.deleteRfpFile(assertId(id));
    refresh();
  });
}
