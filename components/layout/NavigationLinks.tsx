import Link from "next/link";

import {
  isNavigationItemActive,
  navigationItems,
} from "@/components/layout/navigation";

type NavigationLinksProps = {
  pathname: string;
  onNavigate?: () => void;
};

export function NavigationLinks({
  pathname,
  onNavigate,
}: NavigationLinksProps) {
  return (
    <ul className="mt-3 space-y-1.5">
      {navigationItems.map(({ href, label, icon: Icon }) => {
        const isActive = isNavigationItemActive(pathname, href);

        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={isActive ? "page" : undefined}
              onClick={onNavigate}
              className={`relative flex min-h-11 items-center gap-3 rounded-xl border px-3 text-sm transition-[border-color,background-color,color] duration-200 focus-visible:outline-emerald-300 motion-reduce:transition-none ${
                isActive
                  ? "border-emerald-400/20 bg-[linear-gradient(90deg,rgba(16,185,129,0.16),rgba(255,255,255,0.06))] font-semibold text-white"
                  : "border-transparent font-medium text-slate-400 hover:border-white/[0.06] hover:bg-white/[0.05] hover:text-slate-200"
              }`}
            >
              {isActive ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-emerald-400"
                />
              ) : null}
              <Icon
                aria-hidden="true"
                className={`size-5 ${isActive ? "text-emerald-300" : ""}`}
              />
              <span>{label}</span>
              {isActive ? (
                <span className="sr-only">, página atual</span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
