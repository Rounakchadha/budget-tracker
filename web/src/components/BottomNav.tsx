"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { List, CircleAlert, ChartPie, Upload } from "lucide-react";

const TABS = [
  { href: "/", label: "Activity", icon: List },
  { href: "/review", label: "Review", icon: CircleAlert },
  { href: "/summary", label: "Summary", icon: ChartPie },
  { href: "/reconcile", label: "Reconcile", icon: Upload },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
      style={{ background: "color-mix(in srgb, var(--bg) 82%, transparent)", borderColor: "var(--separator)" }}
    >
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px]"
            style={{ color: active ? "var(--accent)" : "var(--text-secondary)" }}
          >
            <Icon size={24} strokeWidth={active ? 2.4 : 2} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
