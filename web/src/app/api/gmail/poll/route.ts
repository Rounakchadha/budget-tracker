import { NextRequest, NextResponse } from "next/server";
import { getGmailClient } from "@/lib/gmail-webhook/client";
import { toRawEmail } from "@/lib/gmail-webhook/email";
import { isKnownNonTransactional, parseAxisEmail } from "@/lib/gmail-webhook/axis-parser";
import { extractWithAiFallback } from "@/lib/gmail-webhook/ai-fallback";
import { supabaseServer } from "@/lib/supabase-server";
import { timingSafeEqualStr } from "@/lib/session";

export const maxDuration = 60;

const SEARCH_QUERY = "from:alerts@axis.bank.in";
const MAX_RESULTS = 25;

function snippet(bodyText: string, maxLen = 500): string {
  return bodyText.replace(/\s+/g, " ").trim().slice(0, maxLen);
}

// A cloud-based mirror of the root project's src/scripts/fetch-transactions.ts
// — same regex-then-AI-fallback parsing, same dedup-by-email_message_id
// insert. This exists purely as insurance against the rare case where a
// Gmail push notification itself gets dropped (Google's own docs note watch
// notifications are best-effort, not guaranteed) — the webhook already
// handles the normal case instantly. Triggered on a schedule by a GitHub
// Actions workflow rather than Vercel Cron, since Vercel's Hobby plan only
// allows daily-or-slower cron jobs, far too infrequent for this.
async function handlePoll(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  if (!timingSafeEqualStr(authHeader, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gmail = getGmailClient();
  const list = await gmail.users.messages.list({ userId: "me", q: SEARCH_QUERY, maxResults: MAX_RESULTS });
  const messages = list.data.messages ?? [];

  let inserted = 0;
  let skippedDupe = 0;
  let unparsed = 0;
  let failed = 0;

  for (const msgRef of messages) {
    if (!msgRef.id) continue;
    try {
      const full = await gmail.users.messages.get({ userId: "me", id: msgRef.id, format: "full" });
      const email = toRawEmail(full.data);

      if (isKnownNonTransactional(email.subject)) continue;

      let parsed = parseAxisEmail(email);
      if (!parsed) {
        parsed = await extractWithAiFallback(email);
      }

      if (!parsed) {
        unparsed++;
        continue;
      }

      const { error } = await supabaseServer.from("transactions").insert({
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

      // 23505 = unique violation on email_message_id — already ingested.
      if (!error) inserted++;
      else if (error.code === "23505") skippedDupe++;
      else throw error;
    } catch (err) {
      // One email's failure shouldn't sink the rest of an unattended run.
      failed++;
      console.error(`gmail poll: failed on message ${msgRef.id}:`, err);
    }
  }

  return NextResponse.json({ ok: true, checked: messages.length, inserted, skippedDupe, unparsed, failed });
}

export const GET = handlePoll;
export const POST = handlePoll;
