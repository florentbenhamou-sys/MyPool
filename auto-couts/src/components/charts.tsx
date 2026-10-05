"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { COST_GROUPS, GROUP_LABELS, type CostGroup } from "@/lib/domain";
import { GROUP_COLORS } from "@/lib/colors";
import { fmtEur, fmtPct } from "@/lib/format";

const axis = { stroke: "var(--muted)", fontSize: 12, tickLine: false, axisLine: { stroke: "var(--grid)" } } as const;
const tooltipStyle = {
  contentStyle: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13 },
  labelStyle: { color: "var(--text-2)", marginBottom: 4 },
  itemStyle: { color: "var(--text)", padding: 0 },
};
const kEur = (v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 100) / 10} k€` : `${Math.round(v)} €`);

/** Répartition des coûts annuels par poste (donut + légende chiffrée servant de tableau). */
export function BreakdownDonut({ byGroup, period = "an" }: { byGroup: Record<CostGroup, number>; period?: "an" | "mois" }) {
  const div = period === "mois" ? 12 : 1;
  const data = COST_GROUPS.map((g) => ({ g, name: GROUP_LABELS[g], value: byGroup[g] / div })).filter((d) => Math.abs(d.value) > 0.005);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!data.length) return <p className="text-sm text-muted">Aucun coût.</p>;
  const positive = data.filter((d) => d.value > 0);
  return (
    <div className="@container">
    <div className="grid gap-4 @md:grid-cols-[180px_1fr] items-center">
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={positive} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="95%" stroke="var(--surface)" strokeWidth={2} isAnimationActive={false}>
              {positive.map((d) => (
                <Cell key={d.g} fill={GROUP_COLORS[d.g]} />
              ))}
            </Pie>
            <Tooltip {...tooltipStyle} formatter={(v) => [`${fmtEur(Number(v))}/${period}`, ""]} separator="" />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <table className="w-full text-sm tnum">
        <tbody>
          {data.map((d) => (
            <tr key={d.g} className="border-b border-line last:border-0">
              <td className="py-1.5 pr-2">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: GROUP_COLORS[d.g] }} />
                  {d.name}
                </span>
              </td>
              <td className="py-1.5 text-right">{fmtEur(d.value, 0)}</td>
              <td className="py-1.5 pl-2 text-right text-muted w-16">{total > 0 ? fmtPct((d.value / total) * 100, 0) : ""}</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="pt-2">Total / {period}</td>
            <td className="pt-2 text-right">{fmtEur(total, 0)}</td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
    </div>
  );
}

export interface Series {
  key: string;
  name: string;
  color: string;
  values: number[];
}

/** Coût cumulé année par année (une courbe par scénario / véhicule). */
export function CumulativeChart({ series, height = 260 }: { series: Series[]; height?: number }) {
  const years = Math.max(0, ...series.map((s) => s.values.length));
  const data = Array.from({ length: years }, (_, y) => ({ year: y, ...Object.fromEntries(series.map((s) => [s.key, s.values[y]])) }));
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="year" {...axis} tickFormatter={(y) => (y === 0 ? "Départ" : `${y} an${y > 1 ? "s" : ""}`)} />
          <YAxis {...axis} tickFormatter={kEur} width={56} />
          <Tooltip {...tooltipStyle} labelFormatter={(y) => `Après ${y} an${Number(y) > 1 ? "s" : ""}`} formatter={(v, n) => [fmtEur(Number(v), 0), n]} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: "var(--text-2)" }} iconType="plainline" />}
          {series.map((s) => (
            <Line key={s.key} dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: s.color }} activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Coût annuel par scénario, empilé par poste. */
export function StackedCostBars({ rows, height = 280 }: { rows: { name: string; byGroup: Record<CostGroup, number> }[]; height?: number }) {
  const groups = COST_GROUPS.filter((g) => rows.some((r) => Math.abs(r.byGroup[g]) > 0.005));
  const data = rows.map((r) => ({ name: r.name, ...r.byGroup }));
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="name" {...axis} interval={0} tick={{ fontSize: 11, fill: "var(--muted)" }} tickFormatter={(n: string) => (n.length > 16 && rows.length > 2 ? `${n.slice(0, 15)}…` : n)} />
          <YAxis {...axis} tickFormatter={kEur} width={56} />
          <Tooltip {...tooltipStyle} cursor={{ fill: "var(--surface-2)" }} formatter={(v, n) => [`${fmtEur(Number(v), 0)}/an`, n]} />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="square" />
          {groups.map((g, i) => (
            <Bar key={g} dataKey={g} name={GROUP_LABELS[g]} stackId="a" fill={GROUP_COLORS[g]} stroke="var(--surface)" strokeWidth={1} radius={i === groups.length - 1 ? [4, 4, 0, 0] : 0} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Coût annuel en fonction du prix d'une énergie. */
export function SensitivityChart({
  points,
  series,
  unit,
  current,
}: {
  points: { price: number; [key: string]: number }[];
  series: { key: string; name: string; color: string }[];
  unit: string;
  current?: number;
}) {
  return (
    <div style={{ height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="price" type="number" domain={["dataMin", "dataMax"]} {...axis} tickFormatter={(p) => `${String(p).replace(".", ",")} €`} />
          <YAxis {...axis} tickFormatter={kEur} width={56} />
          <Tooltip {...tooltipStyle} labelFormatter={(p) => `Prix : ${fmtEur(Number(p), 3)}/${unit}${current !== undefined && Math.abs(Number(p) - current) < 1e-6 ? " (actuel)" : ""}`} formatter={(v, n) => [`${fmtEur(Number(v), 0)}/an`, n]} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} iconType="plainline" />}
          {series.map((s) => (
            <Line key={s.key} dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: s.color }} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
