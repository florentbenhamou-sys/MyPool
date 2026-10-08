"use client";

import { Mail, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/shared/confirm-action";
import { EmptyState } from "@/components/shared/empty-state";
import { IconButton } from "@/components/shared/row-menu";
import { t } from "@/lib/i18n";
import { deleteContactAction } from "@/server/actions/entities";
import { ContactDialog, type ContactView } from "./contact-dialog";

export function ContactsPanel({
  entityId,
  contacts,
}: {
  entityId: string;
  contacts: ContactView[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <ContactDialog
          entityId={entityId}
          trigger={
            <Button>
              <Plus /> {t.contact.new}
            </Button>
          }
        />
      </div>
      {contacts.length === 0 ? (
        <EmptyState>{t.common.emptyList}</EmptyState>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {contacts.map((c) => (
            <li key={c.id} className="bg-card rounded-lg border p-4 shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">
                    {c.firstName} {c.lastName}
                    {!c.active && (
                      <Badge variant="outline" className="ml-2">
                        {t.common.inactive}
                      </Badge>
                    )}
                  </p>
                  {c.role && <p className="text-muted-foreground text-sm">{c.role}</p>}
                </div>
                <div className="flex shrink-0">
                  <ContactDialog
                    entityId={entityId}
                    contact={c}
                    trigger={
                      <IconButton label={t.common.edit}>
                        <Pencil />
                      </IconButton>
                    }
                  />
                  <ConfirmAction
                    trigger={
                      <IconButton label={t.common.delete} className="text-destructive">
                        <Trash2 />
                      </IconButton>
                    }
                    action={() => deleteContactAction(c.id)}
                  />
                </div>
              </div>
              <div className="mt-2 flex flex-col gap-1 text-sm">
                <a
                  href={`mailto:${c.email}`}
                  className="text-primary inline-flex min-h-9 items-center gap-2 break-all"
                >
                  <Mail className="size-4 shrink-0" /> {c.email}
                </a>
                {c.phone && (
                  <a
                    href={`tel:${c.phone.replace(/\s/g, "")}`}
                    className="text-primary inline-flex min-h-9 items-center gap-2"
                  >
                    <Phone className="size-4 shrink-0" /> {c.phone}
                  </a>
                )}
              </div>
              {c.notes && (
                <p className="text-muted-foreground mt-2 text-sm whitespace-pre-line">{c.notes}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
