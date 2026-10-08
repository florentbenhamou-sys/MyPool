import { Globe, Languages, MapPin, Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { ChannelsPanel } from "@/components/entities/channels-panel";
import { ContactsPanel } from "@/components/entities/contacts-panel";
import { EntityActions } from "@/components/entities/entity-actions";
import { EntityTabs } from "@/components/entities/entity-tabs";
import { LinkList } from "@/components/shared/link-list";
import { PageHeader } from "@/components/shared/page-header";
import { ProposalAmount } from "@/components/shared/proposal-amount";
import {
  EntityStatusBadge,
  ProposalStatusBadge,
  TagBadges,
} from "@/components/shared/status-badges";
import { formatDate, toDateInput } from "@/lib/format";
import { t } from "@/lib/i18n";
import { getEntity } from "@/server/data/entities";
import { listProposals } from "@/server/data/proposals";
import { listReferences } from "@/server/data/references";
import { proposalHeadline } from "@/server/proposal-view";
import { fmtDateTime, orNotFound, todayValue } from "@/server/view";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entity = await getEntity(id).catch(() => null);
  return { title: entity?.name ?? t.entity.singular };
}

export default async function EntityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entity = await orNotFound(getEntity(id));
  const [channelTypes, proposals] = await Promise.all([
    listReferences("channelType"),
    listProposals({ entityId: id, includeArchived: true }),
  ]);
  const contactOptions = entity.contacts.map((c) => ({
    id: c.id,
    name: `${c.firstName} ${c.lastName}`,
  }));
  const address = [
    entity.addressLine1,
    entity.addressLine2,
    [entity.postalCode, entity.city].filter(Boolean).join(" "),
    entity.country,
  ]
    .filter(Boolean)
    .join(", ");
  const website =
    entity.website &&
    (/^https?:\/\//.test(entity.website) ? entity.website : `https://${entity.website}`);

  return (
    <>
      <PageHeader
        title={entity.name}
        back={{ href: "/entities", label: t.entity.plural }}
        badges={
          <>
            <EntityStatusBadge status={entity.status} />
            {entity.archivedAt && <Badge variant="outline">{t.entity.archivedBadge}</Badge>}
            <TagBadges tags={entity.tags.map((et) => et.tag)} />
          </>
        }
        actions={
          <EntityActions
            id={id}
            archived={Boolean(entity.archivedAt)}
            hasProposals={entity.proposals.length > 0}
          />
        }
      />

      <Card className="mb-5">
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {entity.communicationLanguage && (
            <p className="flex items-center gap-2">
              <Languages className="text-muted-foreground size-4" />
              {t.languages[entity.communicationLanguage] ?? entity.communicationLanguage}
            </p>
          )}
          {website && (
            <p className="flex min-w-0 items-center gap-2">
              <Globe className="text-muted-foreground size-4 shrink-0" />
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary truncate hover:underline"
              >
                {entity.website}
              </a>
            </p>
          )}
          {address && (
            <p className="flex items-start gap-2">
              <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              {address}
            </p>
          )}
          {entity.notes && (
            <p className="text-muted-foreground whitespace-pre-line sm:col-span-2 lg:col-span-3">
              {entity.notes}
            </p>
          )}
          {!entity.communicationLanguage && !website && !address && !entity.notes && (
            <p className="text-muted-foreground">{t.entity.general} : —</p>
          )}
        </CardContent>
      </Card>

      <EntityTabs
        defaultTab="contacts"
        tabs={[
          { value: "contacts", label: t.contact.plural, count: entity.contacts.length },
          { value: "channels", label: t.channel.plural, count: entity.contactChannels.length },
          { value: "meetings", label: t.meeting.plural, count: entity.meetings.length },
          { value: "demos", label: t.demo.plural, count: entity.demos.length },
          { value: "rfps", label: t.rfp.plural, count: entity.rfpRfis.length },
          { value: "proposals", label: t.proposal.plural, count: proposals.length },
        ]}
      >
        <TabsContent value="contacts">
          <ContactsPanel entityId={id} contacts={entity.contacts} />
        </TabsContent>
        <TabsContent value="channels">
          <ChannelsPanel
            entityId={id}
            today={todayValue()}
            contacts={contactOptions}
            channelTypes={channelTypes.map((c) => ({ id: c.id, label: c.label }))}
            channels={entity.contactChannels.map((c) => ({
              id: c.id,
              typeId: c.typeId,
              contactId: c.contactId,
              eventName: c.eventName,
              contactDate: toDateInput(c.contactDate),
              notes: c.notes,
              typeLabel: c.type.label,
              contactName: c.contact && `${c.contact.firstName} ${c.contact.lastName}`,
              contactDateLabel: formatDate(c.contactDate),
            }))}
          />
        </TabsContent>
        <TabsContent value="meetings">
          <LinkList
            newHref={`/meetings/new?entityId=${id}`}
            newLabel={t.meeting.new}
            items={entity.meetings.map((m) => ({
              id: m.id,
              href: `/meetings/${m.id}`,
              primary: `${t.enums.meetingType[m.type]} #${m.counter} — ${m.title}`,
              secondary: fmtDateTime(m.meetingDate),
              aside: m.demoTarget && <Badge variant="outline">{m.demoTarget.label}</Badge>,
            }))}
          />
        </TabsContent>
        <TabsContent value="demos">
          <LinkList
            newHref={`/demos/new?entityId=${id}`}
            newLabel={t.demo.new}
            items={entity.demos.map((d) => ({
              id: d.id,
              href: `/demos/${d.id}`,
              primary: `Demo #${d.counter} — ${d.title}`,
              secondary: fmtDateTime(d.demoDate),
              aside: <TagBadges tags={d.targets.map((x) => x.demoTarget)} />,
            }))}
          />
        </TabsContent>
        <TabsContent value="rfps">
          <LinkList
            newHref={`/rfps/new?entityId=${id}`}
            newLabel={t.rfp.new}
            items={entity.rfpRfis.map((r) => ({
              id: r.id,
              href: `/rfps/${r.id}`,
              primary: `${r.type} #${r.counter} — ${r.title}`,
              secondary: `${t.rfp.contactDate} : ${formatDate(r.contactDate)}${r.responseDate ? ` · ${t.rfp.responseDate} : ${formatDate(r.responseDate)}` : ""}`,
              aside: r._count.files > 0 && (
                <span className="text-muted-foreground inline-flex items-center gap-1">
                  <Paperclip className="size-4" /> {r._count.files}
                </span>
              ),
            }))}
          />
        </TabsContent>
        <TabsContent value="proposals">
          <LinkList
            newHref={`/proposals/new?entityId=${id}`}
            newLabel={t.proposal.new}
            items={proposals.map((p) => ({
              id: p.id,
              href: `/proposals/${p.id}`,
              primary: (
                <span className="flex flex-wrap items-center gap-2">
                  {p.number} <ProposalStatusBadge status={p.status} />
                  {p.archivedAt && <Badge variant="outline">{t.proposal.archived}</Badge>}
                </span>
              ),
              secondary: formatDate(p.creationDate),
              aside: <ProposalAmount headline={proposalHeadline(p)} currency={p.currency} />,
            }))}
          />
        </TabsContent>
      </EntityTabs>
    </>
  );
}
