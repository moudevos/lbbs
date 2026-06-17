import { ButtonSpinner } from "@/components/ui/loading-state";

export function AttentionSaveBar({ saving, onClick }: { saving?: boolean; onClick?: () => void }) {
  return (
    <button type="submit" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--gold)] px-4 py-3 font-semibold text-black disabled:opacity-60" disabled={saving} onClick={onClick}>
      {saving ? <ButtonSpinner /> : null}
      {saving ? "Guardando atención..." : "Guardar atención"}
    </button>
  );
}
