import type { Parser } from "./types.js";

// Axis sends transaction alerts in (at least) two templates:
//  1. UPI table-style alert: "Amount Debited:\nINR 20.00 ... Transaction Info:\nUPI/P2M/.../Merchant"
//  2. Prose-style alert (non-UPI debits/credits, IFT etc.): "...A/c no. XX1343 has been
//     debited with INR 2499.00 on 01-09-2026 17:14:55 IST by TAIG Initial Funding."
const AMOUNT_RE = /Amount (Debited|Credited):\s*[\r\n]*\s*INR\s*([\d,]+\.\d{2})/i;
const DATE_TIME_RE = /Date\s*&\s*Time:\s*[\r\n]*\s*(\d{2})-(\d{2})-(\d{2}),?\s*(\d{2}):(\d{2}):(\d{2})\s*IST/i;
const TRANSACTION_INFO_RE = /Transaction Info:\s*[\r\n]*\s*(.+)/i;

const PROSE_RE =
  /has been (debited|credited) with INR\s*([\d,]+\.\d{2}) on (\d{2})-(\d{2})-(\d{4})\s*(?:at\s*)?(\d{2}):(\d{2}):(\d{2})\s*IST\s*by\s+(.+?)\./i;

// Emails Axis sends that are never transactions (surveys, promos, etc.) —
// skip these without spending an AI fallback call on them.
const NON_TRANSACTIONAL_SUBJECT_RE = /feedback|survey/i;

export function isKnownNonTransactional(subject: string): boolean {
  return NON_TRANSACTIONAL_SUBJECT_RE.test(subject);
}

// Bank/IFT-style descriptions (e.g. "IFT/AW0005170277/310820260") are reference
// codes, not a human-readable payer/payee name — treat as unrecognized merchant
// so it surfaces for manual review/categorization instead of looking "understood".
// Requires at least one "/" so plain all-caps merchant names (e.g. "ZOMATO")
// aren't mistaken for a reference code.
function isReferenceCodeOnly(description: string): boolean {
  return /^[A-Z0-9]+(\/[A-Z0-9]+)+$/.test(description);
}

// Axis UPI "Transaction Info" lines look like:
//   UPI/P2M/624475917201/Tamjit Alam                (merchant payment)
//   UPI/P2A/624388669706/PRAKHAR S/BARB/UPI          (person-to-account transfer)
// The payee/merchant name is always the 4th slash-separated segment.
function extractMerchant(transactionInfo: string): string | null {
  const parts = transactionInfo.split("/").map((p) => p.trim());
  if (parts.length < 4) return null;
  return parts[3] || null;
}

function parseUpiTableFormat(email: { bodyText: string }) {
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
      confidence: "low" as const,
    };
  }

  return {
    amount,
    currency: "INR",
    direction,
    merchantRaw: merchant,
    source: "Axis Bank",
    transactionDate,
    confidence: "high" as const,
  };
}

function parseProseFormat(email: { bodyText: string }) {
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
    confidence: isReferenceCodeOnly(merchantRaw) ? ("low" as const) : ("high" as const),
  };
}

export const parseAxisEmail: Parser = (email) => {
  return parseUpiTableFormat(email) ?? parseProseFormat(email);
};
