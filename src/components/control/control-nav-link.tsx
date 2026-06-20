"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { useNavigationLoading } from "@/components/navigation/navigation-loading-provider";

export function ControlNavLink({ href, label, icon: Icon, mobile, collapsed, onNavigate }: { href: string; label: string; icon: LucideIcon; mobile?: boolean; collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { startNavigation } = useNavigationLoading();
  const active = pathname === href || (href !== "/app/control" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      onClick={(event) => {
        if (active) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        onNavigate?.();
        startNavigation(href);
      }}
      title={collapsed ? label : undefined}
      className={`${mobile ? "shrink-0 border" : ""} flex items-center ${collapsed ? "justify-center px-2" : "gap-2 px-3"} rounded-xl border-[var(--control-border)] py-2 text-sm transition duration-200 ease-out hover:border-[var(--control-border-strong)] ${
        active ? "border-[var(--control-primary-border)] bg-[var(--control-primary-soft)] font-semibold text-[var(--control-primary)]" : "text-[var(--control-muted)] hover:bg-[var(--control-surface-3)] hover:text-[var(--control-text)]"
      }`}
    >
      <Icon size={16} />
      {!collapsed ? label : null}
    </Link>
  );
}
