"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { t } from "@/lib/i18n";
import { deleteCatalogLineAction, deleteOptionLineAction } from "@/server/actions/proposals";
import { CatalogLineDialog } from "./catalog-line-dialog";
import { LineRow } from "./line-row";
import { OptionLineDialog } from "./option-line-dialog";
import type { CatalogKind, CatalogOptions, LineView, ScenarioView } from "./types";

function Section({
  title,
  total,
  currency,
  addButton,
  children,
  empty,
}: {
  title: string;
  total: string;
  currency: string;
  addButton: React.ReactNode;
  children: React.ReactNode;
  empty: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-baseline gap-2">
          {title}
          <span className="money text-muted-foreground text-sm font-normal">
            {formatMoney(total, currency)}
          </span>
        </CardTitle>
        {addButton}
      </CardHeader>
      <CardContent className="pt-1">
        {empty ? (
          <p className="text-muted-foreground py-2 text-sm">{t.common.noneFem}</p>
        ) : (
          <div className="divide-y">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}

const addLabel = (label: string) => (
  <Button variant="outline" size="sm">
    <Plus /> <span className="sr-only sm:not-sr-only">{label}</span>
  </Button>
);

/** Édition d'un scénario : souscriptions, services (+ options), maintenances, options libres. */
export function ScenarioEditor({
  scenario,
  catalog,
  currency,
  locked,
}: {
  scenario: ScenarioView;
  catalog: CatalogOptions;
  currency: string;
  locked: boolean;
}) {
  const s = scenario.summary;

  const catalogSection = (
    kind: CatalogKind,
    title: string,
    lines: LineView[],
    total: string,
    add: string,
    suffix?: string,
  ) => (
    <Section
      title={title}
      total={total}
      currency={currency}
      empty={lines.length === 0}
      addButton={
        !locked && (
          <CatalogLineDialog
            kind={kind}
            scenarioId={scenario.id}
            catalog={catalog[kind]}
            currency={currency}
            trigger={addLabel(add)}
          />
        )
      }
    >
      {lines.map((line) => (
        <LineRow
          key={line.id}
          line={line}
          currency={currency}
          locked={locked}
          suffix={suffix}
          onDelete={() => deleteCatalogLineAction(kind, line.id)}
          editDialog={(trigger) => (
            <CatalogLineDialog
              kind={kind}
              scenarioId={scenario.id}
              line={line}
              catalog={catalog[kind]}
              currency={currency}
              trigger={trigger}
            />
          )}
        />
      ))}
    </Section>
  );

  return (
    <div className="flex flex-col gap-4">
      {catalogSection(
        "subscription",
        `${t.pricing.subscriptions} (${t.pricing.annual.toLowerCase()})`,
        scenario.subscriptions,
        s.subscription,
        t.pricing.addSubscription,
        t.pricing.perYear,
      )}

      <Section
        title={`${t.pricing.services} (${t.pricing.oneShot.toLowerCase()})`}
        total={s.serviceWithOptions}
        currency={currency}
        empty={scenario.services.length === 0}
        addButton={
          !locked && (
            <CatalogLineDialog
              kind="service"
              scenarioId={scenario.id}
              catalog={catalog.service}
              currency={currency}
              trigger={addLabel(t.pricing.addService)}
            />
          )
        }
      >
        {scenario.services.map((svc) => (
          <div key={svc.id} className="py-0.5">
            <LineRow
              line={svc}
              currency={currency}
              locked={locked}
              onDelete={() => deleteCatalogLineAction("service", svc.id)}
              editDialog={(trigger) => (
                <CatalogLineDialog
                  kind="service"
                  scenarioId={scenario.id}
                  line={svc}
                  catalog={catalog.service}
                  currency={currency}
                  trigger={trigger}
                />
              )}
            />
            {svc.options.map((opt) => (
              <LineRow
                key={opt.id}
                nested
                line={opt}
                currency={currency}
                locked={locked}
                onDelete={() => deleteOptionLineAction("serviceOption", opt.id)}
                editDialog={(trigger) => (
                  <OptionLineDialog
                    kind="serviceOption"
                    parentId={svc.id}
                    line={opt}
                    currency={currency}
                    trigger={trigger}
                  />
                )}
              />
            ))}
            {!locked && (
              <div className="pb-2 pl-4 sm:pl-6">
                <OptionLineDialog
                  kind="serviceOption"
                  parentId={svc.id}
                  currency={currency}
                  trigger={
                    <Button variant="link" size="sm" className="px-0">
                      <Plus /> {t.pricing.addOption}
                    </Button>
                  }
                />
              </div>
            )}
          </div>
        ))}
      </Section>

      {catalogSection(
        "maintenance",
        `${t.pricing.maintenances} (${t.pricing.oneShot.toLowerCase()})`,
        scenario.maintenances,
        s.maintenance,
        t.pricing.addMaintenance,
      )}

      <Section
        title={`${t.pricing.additionalOptions} (${t.pricing.oneShot.toLowerCase()})`}
        total={s.additionalOption}
        currency={currency}
        empty={scenario.additionalOptions.length === 0}
        addButton={
          !locked && (
            <OptionLineDialog
              kind="additionalOption"
              parentId={scenario.id}
              currency={currency}
              trigger={addLabel(t.pricing.addAdditionalOption)}
            />
          )
        }
      >
        {scenario.additionalOptions.map((opt) => (
          <LineRow
            key={opt.id}
            line={opt}
            currency={currency}
            locked={locked}
            onDelete={() => deleteOptionLineAction("additionalOption", opt.id)}
            editDialog={(trigger) => (
              <OptionLineDialog
                kind="additionalOption"
                parentId={scenario.id}
                line={opt}
                currency={currency}
                trigger={trigger}
              />
            )}
          />
        ))}
      </Section>
    </div>
  );
}
