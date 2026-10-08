import { NextResponse } from "next/server";
import { z } from "zod";
import { t } from "@/lib/i18n";
import { config } from "@/server/config";
import { getCurrentUserId } from "@/server/context";
import { addRfpFile } from "@/server/data/rfps";
import { ALLOWED_UPLOADS, extensionOf, sanitizeFileName } from "@/server/storage";
import { errorMessage } from "@/server/actions/run";

/**
 * Upload d'une pièce jointe RFP/RFI.
 * Validation serveur : identifiant, taille maximale, extension autorisée.
 * Le type MIME enregistré est déduit de l'extension (jamais celui fourni par le client).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = z
    .string()
    .uuid()
    .safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: t.common.notFound }, { status: 404 });

  const maxBytes = config().MAX_UPLOAD_MB * 1024 * 1024;
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > maxBytes + 1024 * 64) {
    return NextResponse.json({ error: t.rfp.fileTooLarge }, { status: 413 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: t.validation.required }, { status: 400 });
  if (file.size === 0 || file.size > maxBytes)
    return NextResponse.json({ error: t.rfp.fileTooLarge }, { status: 413 });

  const fileName = sanitizeFileName(file.name);
  const mimeType = ALLOWED_UPLOADS[extensionOf(fileName)];
  if (!mimeType) return NextResponse.json({ error: t.rfp.fileTypeRefused }, { status: 415 });

  try {
    const saved = await addRfpFile(
      id.data,
      { fileName, mimeType, bytes: new Uint8Array(await file.arrayBuffer()) },
      await getCurrentUserId(),
    );
    return NextResponse.json({ id: saved.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 400 });
  }
}
