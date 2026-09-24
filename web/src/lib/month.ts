// The month a transaction is *reported* under can differ from its real
// calendar date — e.g. salary landing Aug 30 but conceptually belonging to
// September. `attributed_month` (format "YYYY-MM") overrides this for
// Summary/dashboard totals only; the real transaction_date always drives
// Net Balance math, since that's about actual money movement over time.
export function effectiveMonth(t: { transaction_date: string; attributed_month?: string | null }): string {
  if (t.attributed_month) return t.attributed_month;
  const d = new Date(t.transaction_date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
