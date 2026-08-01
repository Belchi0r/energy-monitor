import {
  Bell,
  Clock3,
  Cpu,
  LayoutDashboard,
  Settings,
} from "lucide-react";

export const navigationItems = [
  {
    href: "/",
    label: "Visão geral",
    icon: LayoutDashboard,
  },
  {
    href: "/devices",
    label: "Dispositivos",
    icon: Cpu,
  },
  {
    href: "/history",
    label: "Histórico",
    icon: Clock3,
  },
  {
    href: "/alerts",
    label: "Alertas",
    icon: Bell,
  },
  {
    href: "/settings",
    label: "Configurações",
    icon: Settings,
  },
] as const;

export function isNavigationItemActive(pathname: string, href: string) {
  return href === "/"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function getCurrentNavigationItem(pathname: string) {
  return (
    navigationItems.find((item) =>
      isNavigationItemActive(pathname, item.href),
    ) ?? navigationItems[0]
  );
}
