import { ControlThemeProvider } from "@/components/control/control-theme-provider";
import { ControlThemeSelector } from "@/components/control/control-theme-selector";

export default function LocalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="local-app min-h-screen bg-[var(--control-bg)] text-[var(--control-text)]">
      <ControlThemeProvider />
      <div className="fixed right-3 top-3 z-[1200] w-52 rounded-xl border border-[var(--control-border)] bg-[var(--control-surface)] p-2 shadow-[var(--control-shadow)]">
        <ControlThemeSelector />
      </div>
      {children}
    </div>
  );
}
