import * as XLSX from "xlsx";

export function createWorkbook(sheetName: string, rows: Record<string, unknown>[]) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return workbook;
}

export function rowsToWorkbookBuffer(sheetName: string, rows: Record<string, unknown>[]) {
  return XLSX.write(createWorkbook(sheetName, rows), { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function rowsToMultiSheetWorkbookBuffer(sheets: { name: string; rows: Record<string, unknown>[] }[]) {
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const worksheet = XLSX.utils.json_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
  }
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
