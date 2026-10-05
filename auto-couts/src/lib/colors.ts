import type { CostGroup } from "./domain";

/** Palette catégorielle (ordre fixe validé daltonisme) — valeurs claires stockées en base. */
export const SERIES_HEX = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];

/** Couleur CSS adaptée au thème (variable) pour une couleur de la palette. */
export function seriesColor(hex: string | undefined, fallbackIndex = 0): string {
  const i = hex ? SERIES_HEX.indexOf(hex.toLowerCase()) : -1;
  if (i >= 0) return `var(--s${i + 1})`;
  return hex ?? `var(--s${(fallbackIndex % 8) + 1})`;
}

/** Chaque poste de coût garde toujours la même couleur. */
export const GROUP_COLORS: Record<CostGroup, string> = {
  FINANCING: "var(--s1)",
  ENERGY: "var(--s2)",
  INSURANCE: "var(--s3)",
  MAINTENANCE: "var(--s4)",
  TIRES: "var(--s5)",
  TAX: "var(--s7)",
  OTHER: "var(--s6)",
};
