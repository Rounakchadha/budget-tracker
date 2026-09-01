import "dotenv/config";
import type { ParsedTransaction, RawEmail } from "../parsers/types.js";
import { stripSignatureAndFooter, EXTRACTION_SYSTEM_PROMPT, toParsedTransaction, type RawExtraction } from "./shared.js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

export async function extractWithGroqFallback(email: RawEmail): Promise<ParsedTransaction | null> {
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

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
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
