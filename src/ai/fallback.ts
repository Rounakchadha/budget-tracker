import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";
import type { ParsedTransaction, RawEmail } from "../parsers/types.js";
import { stripSignatureAndFooter, EXTRACTION_SYSTEM_PROMPT, toParsedTransaction, type RawExtraction } from "./shared.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function extractWithAnthropicFallback(
  email: RawEmail
): Promise<ParsedTransaction | null> {
  const cleanedBody = stripSignatureAndFooter(email.bodyText);

  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 512,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Subject: ${email.subject}\n\nBody:\n${cleanedBody}`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return null;

  let parsed: RawExtraction;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    return null;
  }

  return toParsedTransaction(parsed, "Unknown (AI fallback)");
}
