import { ControlThemeProvider } from "@/components/control/control-theme-provider";
import { ControlThemeSelector } from "@/components/control/control-theme-selector";
import { LocalNotificationControls } from "@/components/local/local-notification-controls";
import { OperationalToastLayer } from "@/components/notifications/operational-toast-layer";
import { LocalNotificationBridge } from "@/components/local/local-notification-bridge";

export default function LocalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="local-app min-h-screen bg-[var(--control-bg)] text-[var(--control-text)]">
      <ControlThemeProvider />
      <OperationalToastLayer />
      <LocalNotificationBridge />
      <LocalNotificationControls />
      <div className="fixed right-3 top-3 z-[1200] w-52 rounded-xl border border-[var(--control-border)] bg-[var(--control-surface)] p-2 shadow-[var(--control-shadow)]">
        <ControlThemeSelector />
      </div>
      {children}
    </div>
  );
}
