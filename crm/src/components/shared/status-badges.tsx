import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n";

type Variant = React.ComponentProps<typeof Badge>["variant"];

export function EntityStatusBadge({ status }: { status: "PROSPECT" | "CLIENT" }) {
  return (
    <Badge variant={status === "CLIENT" ? "success" : "info"}>{t.enums.entityStatus[status]}</Badge>
  );
}

const proposalVariants: Record<keyof typeof t.enums.proposalStatus, Variant> = {
  DRAFT: "secondary",
  IN_PREPARATION: "info",
  SENT: "warning",
  NEGOTIATION: "warning",
  ACCEPTED: "success",
  REJECTED: "destructive",
  EXPIRED: "outline",
};

export function ProposalStatusBadge({ status }: { status: keyof typeof t.enums.proposalStatus }) {
  return <Badge variant={proposalVariants[status]}>{t.enums.proposalStatus[status]}</Badge>;
}

export function TagBadges({ tags }: { tags: { id: string; label: string }[] }) {
  if (tags.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {tags.map((tag) => (
        <Badge key={tag.id} variant="outline">
          {tag.label}
        </Badge>
      ))}
    </span>
  );
}
