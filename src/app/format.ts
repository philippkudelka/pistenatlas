/** Deutsche Zahl- und Zeitformate. */

const intFmt = new Intl.NumberFormat("de-DE");

export function fmtInt(n: number): string {
  return intFmt.format(n);
}

export function fmtMeters(m: number): string {
  return m ? `${intFmt.format(m)} m` : "—";
}

/** Stunden (dezimal) → "h:mm h" */
export function fmtHhMm(hours: number): string {
  const m = Math.round(hours * 60);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")} h`;
}

/** Sicheres HTML-Escaping für Namen aus den Daten. */
export function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
