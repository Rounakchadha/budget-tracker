import { getGmailClient } from "../gmail/client.js";
import { toRawEmail } from "../gmail/email.js";
import { getParserForSender } from "../parsers/index.js";
import { isKnownNonTransactional } from "../parsers/axis.js";
import { extractWithGroqFallback } from "../ai/groq-fallback.js";
import { extractWithAnthropicFallback } from "../ai/fallback.js";
import { supabase } from "../db/client.js";
import type { ParsedTransaction, RawEmail } from "../parsers/types.js";

const SEARCH_QUERY = "from:alerts@axis.bank.in";
const MAX_RESULTS = 25;
const DRY_RUN = process.argv.includes("--dry-run");

function snippet(bodyText: string, maxLen = 500): string {
  return bodyText.replace(/\s+/g, " ").trim().slice(0, maxLen);
}

async function insertTransaction(email: RawEmail, parsed: ParsedTransaction) {
  const { error } = await supabase.from("transactions").insert({
    email_message_id: email.messageId,
    amount: parsed.amount,
    currency: parsed.currency,
    direction: parsed.direction,
    merchant_raw: parsed.merchantRaw,
    source: parsed.source,
    transaction_date: parsed.transactionDate.toISOString(),
    parsed_confidence: parsed.confidence,
    needs_review: parsed.confidence === "low",
    raw_email_snippet: snippet(email.bodyText),
  });

  // Unique constraint on email_message_id — a re-run hitting the same email
  // is expected and not an error.
  if (error && error.code !== "23505") {
    throw error;
  }
  return { skipped: error?.code === "23505" };
}

async function logUnparsed(email: RawEmail, reason: string) {
  const { error } = await supabase.from("unparsed_emails").insert({
    email_message_id: email.messageId,
    source_guess: email.from,
    reason,
    raw_email_snippet: snippet(email.bodyText),
  });
  if (error && error.code !== "23505") {
    throw error;
  }
}

async function main() {
  if (DRY_RUN) console.log("--- DRY RUN: nothing will be written to Supabase ---\n");

  const gmail = getGmailClient();
  const list = await gmail.users.messages.list({
    userId: "me",
    q: SEARCH_QUERY,
    maxResults: MAX_RESULTS,
  });

  const messages = list.data.messages ?? [];
  console.log(`Found ${messages.length} messages matching "${SEARCH_QUERY}"\n`);

  let inserted = 0;
  let skippedDupe = 0;
  let lowConfidence = 0;
  let aiFallback = 0;
  let unparsed = 0;
  let skippedNonTransactional = 0;

  for (const msgRef of messages) {
    const full = await gmail.users.messages.get({
      userId: "me",
      id: msgRef.id!,
      format: "full",
    });
    const email = toRawEmail(full.data);

    if (isKnownNonTransactional(email.subject)) {
      skippedNonTransactional++;
      console.log(`- SKIP (non-transactional)  ${email.subject}`);
      continue;
    }

    const parser = getParserForSender(email.from);
    let parsed = parser?.(email) ?? null;

    // Prefer Groq (free tier) over Anthropic (paid) when both happen to be configured.
    const fallback = process.env.GROQ_API_KEY
      ? extractWithGroqFallback
      : process.env.ANTHROPIC_API_KEY
        ? extractWithAnthropicFallback
        : null;

    if (!parsed && fallback) {
      try {
        parsed = await fallback(email);
        if (parsed) aiFallback++;
      } catch (err) {
        console.error(`AI fallback failed for ${email.messageId}:`, err);
      }
    }

    if (!parsed) {
      unparsed++;
      console.log(`✗ UNPARSED  ${email.subject}`);
      if (!DRY_RUN) {
        const reason = fallback
          ? "No parser matched and AI fallback failed or returned incomplete data"
          : "No parser matched (AI fallback disabled — no GROQ_API_KEY/ANTHROPIC_API_KEY set)";
        await logUnparsed(email, reason);
      }
      continue;
    }

    if (parsed.confidence === "low") lowConfidence++;

    console.log(
      `✓ ${parsed.direction.toUpperCase().padEnd(6)} ${parsed.currency} ${parsed.amount.toFixed(2).padStart(10)}  ${parsed.merchantRaw}  [${parsed.confidence}]`
    );

    if (!DRY_RUN) {
      const { skipped } = await insertTransaction(email, parsed);
      if (skipped) skippedDupe++;
      else inserted++;
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Total emails:       ${messages.length}`);
  console.log(`Inserted:           ${DRY_RUN ? "N/A (dry run)" : inserted}`);
  console.log(`Skipped (dupe):     ${DRY_RUN ? "N/A (dry run)" : skippedDupe}`);
  console.log(`Low confidence:     ${lowConfidence}`);
  console.log(`Used AI fallback:   ${aiFallback}`);
  console.log(`Unparsed:           ${unparsed}`);
  console.log(`Skipped (non-txn):  ${skippedNonTransactional}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
