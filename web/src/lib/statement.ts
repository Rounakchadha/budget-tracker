export interface StatementRow {
  date: string; // ISO date (YYYY-MM-DD)
  description: string;
  amount: number;
  direction: "debit" | "credit";
}

// Header names vary across banks/exports — these cover the common variants
// seen in Indian netbanking CSV statements. If none match, we surface the
// raw headers instead of guessing, same principle as the email parsers.
const DATE_HEADERS = ["date", "tran date", "transaction date", "value date", "txn date"];
const DESC_HEADERS = ["particulars", "narration", "description", "transaction remarks", "remarks"];
const DEBIT_HEADERS = ["withdrawal amt.", "withdrawal amt", "debit", "withdrawal amount", "dr amount"];
const CREDIT_HEADERS = ["deposit amt.", "deposit amt", "credit", "deposit amount", "cr amount"];

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase();
}

function findHeader(headers: string[], candidates: string[]): string | null {
  const normalized = headers.map(normalizeHeader);
  for (const candidate of candidates) {
    const idx = normalized.indexOf(candidate);
    if (idx !== -1) return headers[idx];
  }
  return null;
}

function parseAmount(value: string | undefined): number {
  if (!value) return 0;
  const cleaned = value.replace(/,/g, "").trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

function parseStatementDate(raw: string): string | null {
  const s = raw.trim();

  const numeric = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (numeric) {
    const [, dd, mm, yy] = numeric;
    const year = yy.length === 2 ? `20${yy}` : yy;
    return `${year}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  const withMonthName = s.match(/^(\d{1,2})[-\s]([A-Za-z]{3})[-\s](\d{2,4})$/);
  if (withMonthName) {
    const [, dd, mon, yy] = withMonthName;
    const mm = MONTHS[mon.toLowerCase()];
    if (!mm) return null;
    const year = yy.length === 2 ? `20${yy}` : yy;
    return `${year}-${mm}-${dd.padStart(2, "0")}`;
  }

  return null;
}

export interface StatementParseResult {
  rows: StatementRow[];
  unrecognizedHeaders: string[] | null;
}

export function parseStatementRows(rawRows: Record<string, string>[]): StatementParseResult {
  if (rawRows.length === 0) return { rows: [], unrecognizedHeaders: null };

  const headers = Object.keys(rawRows[0]);
  const dateHeader = findHeader(headers, DATE_HEADERS);
  const descHeader = findHeader(headers, DESC_HEADERS);
  const debitHeader = findHeader(headers, DEBIT_HEADERS);
  const creditHeader = findHeader(headers, CREDIT_HEADERS);

  if (!dateHeader || (!debitHeader && !creditHeader)) {
    return { rows: [], unrecognizedHeaders: headers };
  }

  const rows: StatementRow[] = [];
  for (const raw of rawRows) {
    const dateStr = raw[dateHeader]?.trim();
    if (!dateStr) continue;
    const date = parseStatementDate(dateStr);
    if (!date) continue;

    const debitVal = debitHeader ? parseAmount(raw[debitHeader]) : 0;
    const creditVal = creditHeader ? parseAmount(raw[creditHeader]) : 0;
    const description = descHeader ? (raw[descHeader] ?? "").trim() : "";

    if (debitVal > 0) {
      rows.push({ date, description, amount: debitVal, direction: "debit" });
    } else if (creditVal > 0) {
      rows.push({ date, description, amount: creditVal, direction: "credit" });
    }
  }

  return { rows, unrecognizedHeaders: null };
}
