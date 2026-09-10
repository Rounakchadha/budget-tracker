// Ported from ../../../../src/ai/{shared,fallback,groq-fallback}.ts — see the
// note in axis-parser.ts. Implemented via plain fetch (no @anthropic-ai/sdk
// dependency) to keep this route's bundle lean, matching the Groq path's
// existing style.

import type { ParsedTransaction, RawEmail } from "./axis-parser";

const FOOTER_MARKERS = [
  /this is a system generated/i,
  /this email is confidential/i,
  /copyright .* bank/i,
  /reach us at/i,
  /unsubscribe/i,
];

function stripSignatureAndFooter(bodyText: string): string {
  let cutIndex = bodyText.length;
  for (const marker of FOOTER_MARKERS) {
    const match = bodyText.match(marker);
    if (match?.index !== undefined && match.index < cutIndex) {
      cutIndex = match.index;
    }
  }
  return bodyText.slice(0, cutIndex).trim().slice(0, 2000);
}

const EXTRACTION_SYSTEM_PROMPT = `You extract structured transaction data from an Indian bank/UPI/card alert email.
Respond with ONLY a single JSON object, no prose, no markdown fences. Fields:
{
  "amount": number,
  "currency": string (ISO code, default "INR"),
  "direction": "debit" | "credit",
  "merchant": string (payee/merchant name as it appears, best effort),
  "transaction_date_iso": string (ISO 8601 timestamp, best effort; if only a date is present use 00:00:00; assume IST/+05:30 if no timezone is given)
}
If a field truly cannot be determined, use null for that field. Do not invent values.`;

interface RawExtraction {
  amount: number | null;
  currency: string | null;
  direction: "debit" | "credit" | null;
  merchant: string | null;
  transaction_date_iso: string | null;
}

function toParsedTransaction(parsed: RawExtraction, source: string): ParsedTransaction | null {
  if (parsed.amount == null || parsed.direction == null || parsed.merchant == null) {
    return null;
  }

  const transactionDate = parsed.transaction_date_iso ? new Date(parsed.transaction_date_iso) : new Date();

  return {
    amount: parsed.amount,
    currency: parsed.currency ?? "INR",
    direction: parsed.direction,
    merchantRaw: parsed.merchant,
    source,
    transactionDate: isNaN(transactionDate.getTime()) ? new Date() : transactionDate,
    confidence: "low",
  };
}

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

async function extractWithGroqFallback(email: RawEmail): Promise<ParsedTransaction | null> {
  const cleanedBody = stripSignatureAndFooter(email.bodyText);

  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: `Subject: ${email.subject}\n\nBody:\n${cleanedBody}` },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Groq API error: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content;
  if (!text) return null;

  let parsed: RawExtraction;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  return toParsedTransaction(parsed, "Unknown (AI fallback)");
}

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

async function extractWithAnthropicFallback(email: RawEmail): Promise<ParsedTransaction | null> {
  const cleanedBody = stripSignatureAndFooter(email.bodyText);

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 512,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Subject: ${email.subject}\n\nBody:\n${cleanedBody}` }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const textBlock = data.content?.find((b) => b.type === "text");
  if (!textBlock?.text) return null;

  let parsed: RawExtraction;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    return null;
  }

  return toParsedTransaction(parsed, "Unknown (AI fallback)");
}

// Same preference as the root ingestion project: Groq (free tier) over
// Anthropic (paid) when both happen to be configured.
export async function extractWithAiFallback(email: RawEmail): Promise<ParsedTransaction | null> {
  if (process.env.GROQ_API_KEY) return extractWithGroqFallback(email);
  if (process.env.ANTHROPIC_API_KEY) return extractWithAnthropicFallback(email);
  return null;
}
