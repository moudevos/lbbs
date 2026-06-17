import { rowsToWorkbookBuffer } from "./create-workbook";

export function xlsxResponse(filename: string, sheetName: string, rows: Record<string, unknown>[]) {
  const buffer = rowsToWorkbookBuffer(sheetName, rows);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
