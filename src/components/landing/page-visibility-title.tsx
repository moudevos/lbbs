"use client";

import { useEffect } from "react";

const visibleTitle = "La Bajadita Barber Studio | Barbería premium en Iquitos";
const hiddenTitle = "Vuelve, tu estilo te espera | La Bajadita";

export function PageVisibilityTitle() {
  useEffect(() => {
    const originalTitle = document.title || visibleTitle;
    function updateTitle() {
      document.title = document.hidden ? hiddenTitle : visibleTitle;
    }
    document.addEventListener("visibilitychange", updateTitle);
    return () => {
      document.removeEventListener("visibilitychange", updateTitle);
      document.title = originalTitle;
    };
  }, []);

  return null;
}
