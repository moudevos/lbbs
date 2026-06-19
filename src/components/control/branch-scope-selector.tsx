"use client";

import { useEffect, useState } from "react";
import { Store } from "lucide-react";
import type { AppRole } from "@/lib/auth/types";

type Branch = { id: string; name: string };

export function BranchScopeSelector({ role, branchName }: { role: AppRole; branchName: string | null }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [value, setValue] = useState("all");

  useEffect(() => {
    if (role !== "admin") return;
    setValue(localStorage.getItem("lbbs:branchScope") ?? "all");
    fetch("/api/control/branches")
      .then((response) => response.json())
      .then((data) => setBranches(data.branches ?? []));
  }, [role]);

  if (role !== "admin") {
    return (
      <span className="inline-flex items-center gap-2 rounded-xl border border-[var(--control-border)] bg-[var(--control-surface-2)] px-3 py-2 text-sm text-[var(--control-muted)]">
        <Store size={16} />
        {branchName ?? "Sin sede"}
      </span>
    );
  }

  return (
    <label className="inline-flex items-center gap-2 rounded-xl border border-[var(--control-border)] bg-[var(--control-surface-2)] px-3 py-2 text-sm text-[var(--control-muted)]">
      <Store size={16} />
      <select
        className="bg-transparent text-[var(--text-main)] outline-none"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          localStorage.setItem("lbbs:branchScope", event.target.value);
          window.dispatchEvent(new CustomEvent("branch-scope-change", { detail: event.target.value }));
        }}
      >
        <option className="bg-[var(--bg-panel)]" value="all">Todas las sedes</option>
        {branches.map((branch) => (
          <option className="bg-[var(--bg-panel)]" key={branch.id} value={branch.id}>{branch.name}</option>
        ))}
      </select>
    </label>
  );
}
