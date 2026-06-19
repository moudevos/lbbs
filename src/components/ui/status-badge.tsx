import { AlertCircle, Ban, CheckCircle2, CircleDollarSign, Clock3, Info, XCircle } from "lucide-react";

type Tone = "neutral" | "warning" | "info" | "success" | "danger";

const statusMap: Record<string, { tone: Tone; icon: typeof Info }> = {
  activo: { tone: "success", icon: CheckCircle2 },
  pendiente: { tone: "warning", icon: Clock3 },
  contactado: { tone: "info", icon: Info },
  confirmado: { tone: "success", icon: CheckCircle2 },
  atendido: { tone: "success", icon: CheckCircle2 },
  registrado: { tone: "info", icon: Info },
  pendiente_pago: { tone: "warning", icon: Clock3 },
  pagado: { tone: "success", icon: CircleDollarSign },
  cancelado: { tone: "danger", icon: XCircle },
  cancelled: { tone: "danger", icon: XCircle },
  anulado: { tone: "danger", icon: Ban },
  no_asistio: { tone: "danger", icon: AlertCircle },
  draft: { tone: "neutral", icon: Clock3 },
  approved: { tone: "warning", icon: CheckCircle2 },
  paid: { tone: "success", icon: CircleDollarSign }
};

export function StatusBadge({ active, label }: { active?: boolean; label?: string }) {
  const text = label ?? (active ? "Activo" : "Inactivo");
  const key = text.toLowerCase().trim().replace(/\s+/g, "_");
  const config = statusMap[key] ?? (active === false ? { tone: "danger" as Tone, icon: XCircle } : { tone: "neutral" as Tone, icon: Info });
  const Icon = config.icon;
  return <span className="control-status-badge" data-tone={config.tone}><Icon size={13} aria-hidden /> {text}</span>;
}
