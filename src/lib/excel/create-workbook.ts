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
