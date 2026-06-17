import Swal from "sweetalert2";

/**
 * Instancia de SweetAlert2 con la identidad visual de La Bajadita
 * (fondo oscuro, acentos oro). Usar en lugar de `Swal` para mantener
 * el estilo consistente. Los `customClass` apuntan a clases definidas
 * en `app/globals.css` (prefijo `lbbs-swal-`).
 */
export const swalThemed = Swal.mixin({
  buttonsStyling: false,
  customClass: {
    popup: "lbbs-swal-popup",
    title: "lbbs-swal-title",
    htmlContainer: "lbbs-swal-text",
    confirmButton: "lbbs-swal-confirm",
    cancelButton: "lbbs-swal-cancel"
  }
});

export function showSuccess(title: string, text = "") {
  return swalThemed.fire(title, text, "success");
}

export function showError(title: string, text = "Intenta nuevamente.") {
  return swalThemed.fire(title, text, "error");
}

export function showWarning(title: string, text = "") {
  return swalThemed.fire(title, text, "warning");
}

export function showInfo(title: string, text = "") {
  return swalThemed.fire(title, text, "info");
}

export async function showConfirm(title: string, text = "Esta accion sera auditada.") {
  const result = await swalThemed.fire({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Confirmar",
    cancelButtonText: "Cancelar"
  });
  return result.isConfirmed;
}

export function showLoading(title = "Procesando...") {
  return swalThemed.fire({
    title,
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });
}

export function closeSwal() {
  Swal.close();
}

export default swalThemed;
