import {
  Boxes,
  Building2,
  CalendarDays,
  FileSignature,
  FileText,
  LayoutDashboard,
  MonitorPlay,
  Package,
  Repeat,
  Settings,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { t } from "@/lib/i18n";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: "/", label: t.nav.dashboard, icon: LayoutDashboard },
      { href: "/entities", label: t.nav.entities, icon: Building2 },
      { href: "/meetings", label: t.nav.meetings, icon: CalendarDays },
      { href: "/demos", label: t.nav.demos, icon: MonitorPlay },
      { href: "/rfps", label: t.nav.rfps, icon: FileText },
      { href: "/proposals", label: t.nav.proposals, icon: FileSignature },
    ],
  },
  {
    label: t.nav.catalogs,
    items: [
      { href: "/catalog/products", label: t.nav.products, icon: Package },
      { href: "/catalog/subscriptions", label: t.nav.subscriptions, icon: Repeat },
      { href: "/catalog/services", label: t.nav.services, icon: Boxes },
      { href: "/catalog/maintenances", label: t.nav.maintenances, icon: Wrench },
    ],
  },
  {
    items: [{ href: "/admin", label: t.nav.admin, icon: Settings }],
  },
];

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
