"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmAction } from "@/components/shared/confirm-action";
import { IconButton } from "@/components/shared/row-menu";
import { t } from "@/lib/i18n";
import { deleteRfpFileAction } from "@/server/actions/activities";

export interface RfpFileView {
  id: string;
  fileName: string;
  sizeLabel: string;
  dateLabel: string;
}

/** Pièces jointes d'un RFP/RFI. L'envoi passe par /api/rfps/[id]/files (validation serveur). */
export function RfpFiles({
  rfpId,
  files,
  maxMb,
  accept,
}: {
  rfpId: string;
  files: RfpFileView[];
  maxMb: number;
  accept: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  async function upload(file: File) {
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`${t.rfp.fileTooLarge} (max ${maxMb} Mo)`);
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`/api/rfps/${rfpId}/files`, { method: "POST", body });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) toast.error(json.error ?? t.common.unexpectedError);
      else {
        toast.success(t.common.saved);
        router.refresh();
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.rfp.files}</CardTitle>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
          {uploading ? t.rfp.uploading : t.rfp.upload}
        </Button>
      </CardHeader>
      <CardContent className="pt-2">
        {files.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t.rfp.noFiles}</p>
        ) : (
          <ul className="divide-y">
            {files.map((f) => (
              <li key={f.id} className="flex items-center gap-2 py-2">
                <FileText className="text-muted-foreground size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <a
                    href={`/api/files/${f.id}`}
                    className="text-primary block truncate text-sm font-medium hover:underline"
                  >
                    {f.fileName}
                  </a>
                  <p className="text-muted-foreground text-xs">
                    {f.sizeLabel} · {f.dateLabel}
                  </p>
                </div>
                <IconButton label={t.common.open} asChild>
                  <a href={`/api/files/${f.id}`}>
                    <Download />
                  </a>
                </IconButton>
                <ConfirmAction
                  trigger={
                    <IconButton label={t.common.delete} className="text-destructive">
                      <Trash2 />
                    </IconButton>
                  }
                  action={() => deleteRfpFileAction(f.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
