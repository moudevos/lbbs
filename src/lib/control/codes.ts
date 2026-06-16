export async function nextCode(
  admin: { from: (table: string) => any },
  table: string,
  column: string,
  prefix: string,
  digits: number
) {
  const { data } = await admin.from(table).select(column).like(column, `${prefix}-%`).order(column, { ascending: false }).limit(1);
  const last = data?.[0]?.[column] as string | undefined;
  const n = last ? Number.parseInt(last.replace(`${prefix}-`, ""), 10) : 0;
  return `${prefix}-${String(Number.isFinite(n) ? n + 1 : 1).padStart(digits, "0")}`;
}
