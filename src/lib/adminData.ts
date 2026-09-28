export type DataRecord = Record<string, unknown>;

export function asRecord(value: unknown): DataRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as DataRecord : {};
}

export function atPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => asRecord(value)[key], source);
}

export function pick(source: unknown, ...paths: string[]): unknown {
  for (const path of paths) {
    const value = atPath(source, path);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

export function text(value: unknown, fallback = "—"): string {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

export function number(value: unknown, fallback = 0): number {
  const result = typeof value === "number" ? value : Number(value);
  return Number.isFinite(result) ? result : fallback;
}

export function rows(value: unknown): DataRecord[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

export function money(value: unknown): string {
  return new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(number(value) / 100);
}

export function shortDate(value: unknown): string {
  if (typeof value !== "string" || !value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function statusText(value: unknown): string {
  return text(value, "Unknown").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function countValue(source: unknown, ...paths: string[]): number | undefined {
  const value = pick(source, ...paths);
  if (typeof value === "number") return value;
  if (Array.isArray(value)) return value.length;
  return undefined;
}
