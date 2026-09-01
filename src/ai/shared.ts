const FOOTER_MARKERS = [
  /this is a system generated/i,
  /this email is confidential/i,
  /copyright .* bank/i,
  /reach us at/i,
  /unsubscribe/i,
];

// Trims the email down to just the transactional content before it's sent
// to any API — cuts at the first boilerplate/footer/legal marker found.
export function stripSignatureAndFooter(bodyText: string): string {
  let cutIndex = bodyText.length;
  for (const marker of FOOTER_MARKERS) {
    const match = bodyText.match(marker);
    if (match?.index !== undefined && match.index < cutIndex) {
      cutIndex = match.index;
    }
  }
  return bodyText.slice(0, cutIndex).trim().slice(0, 2000);
}

export const EXTRACTION_SYSTEM_PROMPT = `You extract structured transaction data from an Indian bank/UPI/card alert email.
Respond with ONLY a single JSON object, no prose, no markdown fences. Fields:
{
  "amount": number,
  "currency": string (ISO code, default "INR"),
  "direction": "debit" | "credit",
  "merchant": string (payee/merchant name as it appears, best effort),
  "transaction_date_iso": string (ISO 8601 timestamp, best effort; if only a date is present use 00:00:00; assume IST/+05:30 if no timezone is given)
}
If a field truly cannot be determined, use null for that field. Do not invent values.`;

export interface RawExtraction {
  amount: number | null;
  currency: string | null;
  direction: "debit" | "credit" | null;
  merchant: string | null;
  transaction_date_iso: string | null;
}

export function toParsedTransaction(parsed: RawExtraction, source: string) {
  if (parsed.amount == null || parsed.direction == null || parsed.merchant == null) {
    return null;
  }

  const transactionDate = parsed.transaction_date_iso
    ? new Date(parsed.transaction_date_iso)
    : new Date();

  return {
    amount: parsed.amount,
    currency: parsed.currency ?? "INR",
    direction: parsed.direction,
    merchantRaw: parsed.merchant,
    source,
    transactionDate: isNaN(transactionDate.getTime()) ? new Date() : transactionDate,
    confidence: "low" as const,
  };
}
