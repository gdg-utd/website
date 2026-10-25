export function csvCell(value: unknown) {
  const raw = value === null || value === undefined ? "" : String(value);
  const text = /^[\x00-\x20]*[=+\-@]|^[\t\r\n]/.test(raw) ? `'${raw}` : raw;
  return `"${text.replaceAll('"', '""')}"`;
}
