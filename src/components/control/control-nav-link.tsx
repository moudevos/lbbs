"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { useNavigationLoading } from "@/components/navigation/navigation-loading-provider";

export function ControlNavLink({ href, label, icon: Icon, mobile, onNavigate }: { href: string; label: string; icon: LucideIcon; mobile?: boolean; onNavigate?: () => void }) {
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
      className={`${mobile ? "shrink-0 border" : ""} flex items-center gap-2 rounded-md border-[var(--border-soft)] px-3 py-2 text-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--gold-soft)] ${
        active ? "bg-[rgba(212,175,55,0.16)] text-white" : "text-[var(--text-muted)] hover:bg-[rgba(212,175,55,0.1)] hover:text-white"
      }`}
    >
      <Icon size={16} />
      {label}
    </Link>
  );
}
