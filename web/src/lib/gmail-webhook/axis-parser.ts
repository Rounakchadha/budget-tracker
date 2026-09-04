// Ported from ../../../../src/parsers/axis.ts — kept as a plain copy rather
// than a shared import so the web app stays deployable on its own (separate
// package.json/node_modules from the root ingestion project). If you change
// the parsing rules there, mirror the change here too.
//
// This is the fast, regex-only path used by the Gmail push webhook — no AI
// fallback, so it never blocks the push ack on an external API call. Emails
// this can't parse are left for the existing local poller
// (src/scripts/fetch-transactions.ts), which does have AI fallback and will
// pick them up on its next run; inserts are deduped by email_message_id so
// there's no risk of double-processing.

export interface ParsedTransaction {
  amount: number;
  currency: string;
  direction: "debit" | "credit";
  merchantRaw: string;
  source: string;
  transactionDate: Date;
  confidence: "high" | "low";
}

export interface RawEmail {
  messageId: string;
  from: string;
  subject: string;
  bodyText: string;
}

const AMOUNT_RE = /Amount (Debited|Credited):\s*[\r\n]*\s*INR\s*([\d,]+\.\d{2})/i;
const DATE_TIME_RE = /Date\s*&\s*Time:\s*[\r\n]*\s*(\d{2})-(\d{2})-(\d{2}),?\s*(\d{2}):(\d{2}):(\d{2})\s*IST/i;
const TRANSACTION_INFO_RE = /Transaction Info:\s*[\r\n]*\s*(.+)/i;

const PROSE_RE =
  /has been (debited|credited) with INR\s*([\d,]+\.\d{2}) on (\d{2})-(\d{2})-(\d{4})\s*(?:at\s*)?(\d{2}):(\d{2}):(\d{2})\s*IST\s*by\s+(.+?)\./i;

const NON_TRANSACTIONAL_SUBJECT_RE = /feedback|survey/i;

export function isKnownNonTransactional(subject: string): boolean {
  return NON_TRANSACTIONAL_SUBJECT_RE.test(subject);
}

function isReferenceCodeOnly(description: string): boolean {
  return /^[A-Z0-9]+(\/[A-Z0-9]+)+$/.test(description);
}

function extractMerchant(transactionInfo: string): string | null {
  const parts = transactionInfo.split("/").map((p) => p.trim());
  if (parts.length < 4) return null;
  return parts[3] || null;
}

function parseUpiTableFormat(email: { bodyText: string }): ParsedTransaction | null {
  const amountMatch = email.bodyText.match(AMOUNT_RE);
  const dateMatch = email.bodyText.match(DATE_TIME_RE);
  const infoMatch = email.bodyText.match(TRANSACTION_INFO_RE);

  if (!amountMatch || !dateMatch) return null;

  const direction: "debit" | "credit" = amountMatch[1].toLowerCase() === "debited" ? "debit" : "credit";
  const amount = parseFloat(amountMatch[2].replace(/,/g, ""));

  const [, dd, mm, yy, hh, min, ss] = dateMatch;
  const transactionDate = new Date(`20${yy}-${mm}-${dd}T${hh}:${min}:${ss}+05:30`);

  const merchant = infoMatch ? extractMerchant(infoMatch[1]) : null;

  if (!merchant || isNaN(transactionDate.getTime())) {
    return {
      amount,
      currency: "INR",
      direction,
      merchantRaw: merchant ?? "UNKNOWN",
      source: "Axis Bank",
      transactionDate: isNaN(transactionDate.getTime()) ? new Date() : transactionDate,
      confidence: "low",
    };
  }

  return {
    amount,
    currency: "INR",
    direction,
    merchantRaw: merchant,
    source: "Axis Bank",
    transactionDate,
    confidence: "high",
  };
}

function parseProseFormat(email: { bodyText: string }): ParsedTransaction | null {
  const match = email.bodyText.match(PROSE_RE);
  if (!match) return null;

  const [, directionWord, rawAmount, dd, mm, yyyy, hh, min, ss, description] = match;
  const direction: "debit" | "credit" = directionWord.toLowerCase() === "debited" ? "debit" : "credit";
  const amount = parseFloat(rawAmount.replace(/,/g, ""));
  const transactionDate = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}+05:30`);

  const merchantRaw = description.trim();

  return {
    amount,
    currency: "INR",
    direction,
    merchantRaw,
    source: "Axis Bank",
    transactionDate: isNaN(transactionDate.getTime()) ? new Date() : transactionDate,
    confidence: isReferenceCodeOnly(merchantRaw) ? "low" : "high",
  };
}

export function parseAxisEmail(email: { bodyText: string }): ParsedTransaction | null {
  return parseUpiTableFormat(email) ?? parseProseFormat(email);
}
