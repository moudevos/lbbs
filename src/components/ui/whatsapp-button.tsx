import { MessageCircle } from "lucide-react";

export function WhatsappButton({ href }: { href: string }) {
  return (
    <a className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm" href={href} target="_blank">
      <MessageCircle size={16} />
      WhatsApp
    </a>
  );
}
