"use client";

import { useState } from "react";
import { showError, showSuccess } from "@/lib/ui/swal";

type CsvToolsPanelProps = {
  title: string;
  templateUrl?: string;
  importUrl?: string;
  exportUrl?: string;
  format?: "csv" | "xlsx";
  exportFormat?: "csv" | "xlsx";
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

export function CsvToolsPanel({ title, templateUrl, importUrl, exportUrl, format = "csv", exportFormat = format, onImported }: CsvToolsPanelProps) {
  const [working, setWorking] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);
  const [pendingRows, setPendingRows] = useState<Record<string, unknown>[]>([]);

  async function importFile(file: File | null) {
    if (!file || !importUrl) return;
    setSummary(null);
    if (format === "xlsx") {
      setPreviewing(true);
      try {
        const XLSX = await import("xlsx");
        const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const rows = sheetName ? XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: "" }) : [];
        const response = await fetch(importUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows }) });
        const data = await response.json();
        if (!response.ok) return showError("No se pudo previsualizar", data.error ?? "Revisa el archivo.");
        setSelectedFile(file);
        setPendingRows(rows);
        setPreviewRows(data.preview ?? rows);
        setSummary(`Previsualización lista. Filas leídas: ${data.read ?? rows.length}. Nuevos: ${data.newCount ?? 0}. Existentes: ${data.existingCount ?? 0}. Inválidos/duplicados: ${data.skippedCount ?? 0}. Revisa antes de confirmar.`);
      } catch (error) {
        await showError("No se pudo previsualizar", error instanceof Error ? error.message : "Archivo XLSX invalido.");
      } finally {
        setPreviewing(false);
      }
      return;
    }

    setPreviewing(true);
    try {
      const rows = parseCsv(await file.text());
      const response = await fetch(importUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows }) });
      const data = await response.json();
      if (!response.ok) return showError("No se pudo previsualizar", data.error ?? "Revisa el archivo.");
      setSelectedFile(file);
      setPendingRows(rows);
      setPreviewRows(data.preview ?? rows);
      setSummary(`Previsualizacion lista. Filas leidas: ${data.read ?? rows.length}. Revisa estados antes de confirmar.`);
    } finally {
      setPreviewing(false);
    }
  }

  async function confirmImport() {
    if (!selectedFile || !importUrl) return;
    setWorking(true);
    try {
      const confirmUrl = importUrl.replace(/import-preview$/, "import-confirm");
      const response = await fetch(confirmUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows: pendingRows }) });
      const data = await response.json();
      if (!response.ok) return showError("No se pudo importar", data.error ?? "Revisa el archivo.");
      const errors = data.errors ?? [];
      setSummary(`Leídas: ${data.read ?? pendingRows.length}. Creadas: ${data.created ?? 0}. Actualizadas: ${data.updated ?? 0}. Existentes: ${data.existing ?? 0}. Omitidas: ${data.skipped ?? 0}. Errores: ${errors.length}.`);
      setSelectedFile(null);
      setPendingRows([]);
      setPreviewRows([]);
      await showSuccess("Importación completada");
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
          <p className="mt-1 text-xs text-[var(--text-muted)]">{format === "xlsx" ? "Formato XLSX con previsualización antes de guardar." : "Formato CSV compatible con Google Contacts."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {templateUrl ? <a className="rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm" href={templateUrl}>Descargar plantilla</a> : null}
          {exportUrl ? <a className="rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm" href={exportUrl}>Exportar {exportFormat.toUpperCase()}</a> : null}
          {importUrl ? <label className="cursor-pointer rounded-lg bg-[var(--gold)] px-3 py-2 text-sm font-semibold text-black">{working ? "Importando..." : previewing ? "Previsualizando..." : format === "xlsx" ? "Previsualizar XLSX" : "Importar CSV"}<input className="hidden" type="file" accept={format === "csv" ? ".csv,text/csv" : ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"} disabled={working || previewing} onChange={(event) => importFile(event.target.files?.[0] ?? null)} /></label> : null}
          {selectedFile ? <button className="rounded-lg border border-[var(--gold)] px-3 py-2 text-sm font-semibold text-[var(--gold)] disabled:opacity-60" disabled={working} onClick={confirmImport}>{working ? "Guardando..." : "Confirmar importación"}</button> : null}
        </div>
      </div>
      {summary ? <p className="mt-3 rounded-lg border border-[var(--border-soft)] px-3 py-2 text-xs text-[var(--text-muted)]">{summary}</p> : null}
      {previewRows.length > 0 ? (
        <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--border-soft)]">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-black/50 text-[var(--gold-soft)]">
              <tr>{Object.keys(previewRows[0] ?? {}).slice(0, 10).map((key) => <th key={key} className="px-3 py-2">{key}</th>)}</tr>
            </thead>
            <tbody>
              {previewRows.slice(0, 8).map((row, index) => (
                <tr key={index} className="border-t border-[var(--border-soft)]">
                  {Object.keys(previewRows[0] ?? {}).slice(0, 10).map((key) => <td key={key} className="px-3 py-2 text-[var(--text-muted)]">{String(row[key] ?? "")}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          {previewRows.length > 8 ? <p className="border-t border-[var(--border-soft)] px-3 py-2 text-xs text-[var(--text-muted)]">Mostrando 8 de {previewRows.length} filas.</p> : null}
        </div>
      ) : null}
    </section>
  );
}
