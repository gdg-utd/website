export type QueryValue = string | string[] | null | undefined;

export function queryValue(value: QueryValue): string | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}

/** Only local absolute paths are accepted, before and after URL normalization. */
export function safeNextPath(value: QueryValue, fallback = "/"): string {
  const path = queryValue(value);
  if (!path?.startsWith("/") || path.startsWith("//") || /[\\\x00-\x20\x7f]/.test(path)) return fallback;
  try {
    const base = "https://local.invalid";
    const destination = new URL(path, base);
    if (destination.origin !== base || destination.pathname.startsWith("//")) return fallback;
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return fallback;
  }
}

export function normalizeQuery<T extends Record<string, QueryValue>>(query: T): { [K in keyof T]: string | undefined } {
  return Object.fromEntries(Object.entries(query).map(([key, value]) => [key, queryValue(value)])) as { [K in keyof T]: string | undefined };
}
