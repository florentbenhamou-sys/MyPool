import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Bloc de texte long (notes, transcript, prochaines étapes). Rendu en texte : pas de HTML injecté. */
export function TextBlock({ title, text }: { title: string; text: string | null | undefined }) {
  if (!text) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-2 text-sm leading-relaxed break-words whitespace-pre-line">
        {text}
      </CardContent>
    </Card>
  );
}

/** Grille de propriétés (libellé / valeur). */
export function Properties({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <Card>
      <CardContent>
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.label} className="min-w-0">
              <dt className="text-muted-foreground text-xs">{item.label}</dt>
              <dd className="mt-0.5 font-medium break-words">{item.value || "—"}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
