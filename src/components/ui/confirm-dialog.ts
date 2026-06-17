import { swalThemed } from "@/lib/ui/swal";

export async function confirmDialog(title: string, text?: string) {
  const result = await swalThemed.fire({ title, text, icon: "warning", showCancelButton: true, confirmButtonText: "Confirmar", cancelButtonText: "Cancelar" });
  return result.isConfirmed;
}
