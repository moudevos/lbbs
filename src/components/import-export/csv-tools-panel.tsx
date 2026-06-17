"use client";

import { useState } from "react";
import { showError, showSuccess } from "@/lib/ui/swal";

type CsvToolsPanelProps = {
  title: string;
  templateUrl?: string;
  importUrl?: string;
  exportUrl?: string;
  onImported?: () => void;
};

function parseCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

export function CsvToolsPanel({ title, templateUrl, importUrl, exportUrl, onImported }: CsvToolsPanelProps) {
  const [working, setWorking] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  async function importFile(file: File | null) {
    if (!file || !importUrl) return;
    setWorking(true);
    try {
      const rows = parseCsv(await file.text());
      const response = await fetch(importUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows })
      });
      const data = await response.json();
      if (!response.ok) return showError("No se pudo importar", data.error ?? "Revisa el archivo.");
      setSummary(`Leidas: ${data.read ?? rows.length}. Creadas: ${data.created ?? 0}. Existentes: ${data.existing ?? 0}. Omitidas: ${data.skipped ?? 0}. Errores: ${(data.errors ?? []).length}.`);
      await showSuccess("Importacion completada");
      onImported?.();
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--border-soft)] bg-black/35 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Formato CSV compatible con Excel/Google Contacts.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {templateUrl ? <a className="rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm" href={templateUrl}>Descargar plantilla</a> : null}
          {exportUrl ? <a className="rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm" href={exportUrl}>Exportar CSV</a> : null}
          {importUrl ? <label className="cursor-pointer rounded-lg bg-[var(--gold)] px-3 py-2 text-sm font-semibold text-black">{working ? "Importando..." : "Importar CSV"}<input className="hidden" type="file" accept=".csv,text/csv" disabled={working} onChange={(event) => importFile(event.target.files?.[0] ?? null)} /></label> : null}
        </div>
      </div>
      {summary ? <p className="mt-3 rounded-lg border border-[var(--border-soft)] px-3 py-2 text-xs text-[var(--text-muted)]">{summary}</p> : null}
    </section>
  );
}
