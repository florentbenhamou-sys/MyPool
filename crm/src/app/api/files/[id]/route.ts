import { z } from "zod";
import { getRfpFile } from "@/server/data/rfps";
import { getStorage } from "@/server/storage";

/**
 * Téléchargement d'une pièce jointe. Toujours en « attachment » + nosniff :
 * un fichier ne peut pas s'exécuter dans le contexte de l'application (XSS).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = z
    .string()
    .uuid()
    .safeParse((await params).id);
  if (!id.success) return new Response("Not found", { status: 404 });
  const file = await getRfpFile(id.data);
  if (!file) return new Response("Not found", { status: 404 });
  const data = await getStorage().get(file.storageKey);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(data.byteLength),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
