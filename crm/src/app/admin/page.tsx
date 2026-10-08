import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { ReferenceAdmin } from "@/components/admin/reference-admin";
import { EntityTabs } from "@/components/entities/entity-tabs";
import { PageHeader } from "@/components/shared/page-header";
import { t } from "@/lib/i18n";
import { listReferences, listTags } from "@/server/data/references";
import { listUsers } from "@/server/data/users";

export const metadata = { title: t.admin.title };

export default async function AdminPage() {
  const [tags, channelTypes, demoTargets, users] = await Promise.all([
    listTags(true),
    listReferences("channelType", true),
    listReferences("demoTarget", true),
    listUsers(),
  ]);
  const enums: { title: string; values: Record<string, string> }[] = [
    { title: t.entity.status, values: t.enums.entityStatus },
    { title: `${t.meeting.plural} — ${t.common.type}`, values: t.enums.meetingType },
    { title: `${t.rfp.plural} — ${t.common.type}`, values: t.enums.rfpRfiType },
    { title: `${t.proposal.plural} — ${t.proposal.status}`, values: t.enums.proposalStatus },
  ];
  return (
    <>
      <PageHeader title={t.admin.title} />
      <EntityTabs
        defaultTab="tags"
        tabs={[
          { value: "tags", label: t.admin.tags, count: tags.length },
          { value: "channels", label: t.admin.channelTypes, count: channelTypes.length },
          { value: "targets", label: t.admin.demoTargets, count: demoTargets.length },
          { value: "enums", label: t.admin.enums },
          { value: "users", label: t.admin.users, count: users.length },
        ]}
      >
        <TabsContent value="tags">
          <ReferenceAdmin kind="tag" items={tags} />
        </TabsContent>
        <TabsContent value="channels">
          <ReferenceAdmin kind="channelType" items={channelTypes} />
        </TabsContent>
        <TabsContent value="targets">
          <ReferenceAdmin kind="demoTarget" items={demoTargets} />
        </TabsContent>
        <TabsContent value="enums">
          <p className="text-muted-foreground mb-3 text-sm">{t.admin.enumsHint}</p>
          <div className="grid gap-3 md:grid-cols-2">
            {enums.map((e) => (
              <Card key={e.title}>
                <CardHeader>
                  <CardTitle>{e.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-1.5 pt-2">
                  {Object.entries(e.values).map(([code, label]) => (
                    <Badge key={code} variant="outline" title={code}>
                      {label}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="users">
          <Card className="divide-y">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <span className="min-w-0">
                  <span className="block font-medium">{u.name}</span>
                  <span className="text-muted-foreground block truncate">{u.email}</span>
                </span>
                <Badge variant={u.active ? "success" : "outline"}>
                  {u.active ? t.common.active : t.common.inactive}
                </Badge>
              </div>
            ))}
          </Card>
        </TabsContent>
      </EntityTabs>
    </>
  );
}
