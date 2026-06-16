import Swal from "sweetalert2";

export async function confirmDialog(title: string, text?: string) {
  const result = await Swal.fire({ title, text, icon: "warning", showCancelButton: true, confirmButtonText: "Confirmar", cancelButtonText: "Cancelar" });
  return result.isConfirmed;
}
