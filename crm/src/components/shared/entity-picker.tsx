"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { NativeSelect } from "@/components/ui/native-select";
import { t } from "@/lib/i18n";

/** Première étape d'une création rattachée à une entité (meeting, démo, RFP, proposition). */
export function EntityPicker({
  entities,
  basePath,
}: {
  entities: { id: string; name: string }[];
  basePath: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  return (
    <form
      className="flex max-w-xl flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (value) router.replace(`${basePath}?entityId=${value}`);
      }}
    >
      <FormField label={t.entity.pick} htmlFor="entity-pick" required>
        <NativeSelect
          id="entity-pick"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
        >
          <option value="">—</option>
          {entities.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <Button type="submit" disabled={!value} className="sm:w-fit">
        {t.entity.continue}
      </Button>
    </form>
  );
}
