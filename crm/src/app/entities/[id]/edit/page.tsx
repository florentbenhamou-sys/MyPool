import { PageHeader } from "@/components/shared/page-header";
import { EntityForm } from "@/components/entities/entity-form";
import { t } from "@/lib/i18n";
import { getEntity } from "@/server/data/entities";
import { listTags } from "@/server/data/references";
import { orNotFound } from "@/server/view";

export default async function EditEntityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [entity, tags] = await Promise.all([orNotFound(getEntity(id)), listTags()]);
  return (
    <>
      <PageHeader
        title={`${t.common.edit} — ${entity.name}`}
        back={{ href: `/entities/${id}`, label: entity.name }}
      />
      <EntityForm
        entityId={id}
        tagOptions={tags.map((tag) => ({ value: tag.id, label: tag.label, group: tag.category }))}
        defaultValues={{
          name: entity.name,
          status: entity.status,
          communicationLanguage: entity.communicationLanguage ?? "",
          website: entity.website ?? "",
          addressLine1: entity.addressLine1 ?? "",
          addressLine2: entity.addressLine2 ?? "",
          postalCode: entity.postalCode ?? "",
          city: entity.city ?? "",
          country: entity.country ?? "",
          notes: entity.notes ?? "",
          tagIds: entity.tags.map((et) => et.tagId),
        }}
      />
    </>
  );
}
