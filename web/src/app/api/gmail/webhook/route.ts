import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { getGmailClient } from "@/lib/gmail-webhook/client";
import { toRawEmail } from "@/lib/gmail-webhook/email";
import { isKnownNonTransactional, parseAxisEmail } from "@/lib/gmail-webhook/axis-parser";
import { supabaseServer } from "@/lib/supabase-server";

// Receives Google Cloud Pub/Sub push notifications for new mail (set up via
// gmail.users.watch — see /api/gmail/watch). Google pushes within seconds of
// a new Axis alert landing; this diffs the mailbox history since our last
// known position, parses anything it recognizes with the fast regex parser,
// and inserts it. Anything it can't parse is left for the local poller
// (src/scripts/fetch-transactions.ts), which has the AI fallback and runs
// every few minutes as a backstop — inserts are deduped by
// email_message_id, so there's no double-insert risk either way.

const oidcClient = new OAuth2Client();

function snippet(bodyText: string, maxLen = 500): string {
  return bodyText.replace(/\s+/g, " ").trim().slice(0, maxLen);
}

async function verifyPushRequest(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const audience = process.env.PUBSUB_PUSH_AUDIENCE;
  const expectedServiceAccount = process.env.PUBSUB_PUSH_SERVICE_ACCOUNT;

  if (!token || !audience || !expectedServiceAccount) return false;

  try {
    const ticket = await oidcClient.verifyIdToken({ idToken: token, audience });
    const payload = ticket.getPayload();
    return !!payload && payload.email_verified === true && payload.email === expectedServiceAccount;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!(await verifyPushRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const dataB64: string | undefined = body?.message?.data;
  if (!dataB64) return NextResponse.json({ ok: true, note: "no message data" });

  const decoded = JSON.parse(Buffer.from(dataB64, "base64").toString("utf-8")) as {
    emailAddress: string;
    historyId: string | number;
  };

  const { data: state } = await supabaseServer
    .from("gmail_sync_state")
    .select("history_id")
    .eq("id", "singleton")
    .maybeSingle();

  const startHistoryId = state?.history_id;

  // No stored position yet (first notification after starting the watch) —
  // nothing to diff against. Just record where we are now and wait for the
  // next notification.
  if (!startHistoryId) {
    await supabaseServer
      .from("gmail_sync_state")
      .update({ history_id: String(decoded.historyId), updated_at: new Date().toISOString() })
      .eq("id", "singleton");
    return NextResponse.json({ ok: true, note: "initialized history cursor" });
  }

  const gmail = getGmailClient();
  const newMessageIds = new Set<string>();
  let pageToken: string | undefined;
  let latestHistoryId = startHistoryId;
  let historyExpired = false;

  try {
    do {
      const res = await gmail.users.history.list({
        userId: "me",
        startHistoryId,
        historyTypes: ["messageAdded"],
        pageToken,
      });
      for (const record of res.data.history ?? []) {
        for (const added of record.messagesAdded ?? []) {
          if (added.message?.id) newMessageIds.add(added.message.id);
        }
      }
      if (res.data.historyId) latestHistoryId = res.data.historyId;
      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);
  } catch (err) {
    // Gmail only retains ~a week of history; a stale cursor 404s. Reset to
    // the notification's historyId and let the next notification diff from
    // there — the local poller backstop covers anything missed in between.
    const status = (err as { code?: number; status?: number })?.code ?? (err as { status?: number })?.status;
    if (status === 404) {
      historyExpired = true;
      latestHistoryId = String(decoded.historyId);
    } else {
      throw err;
    }
  }

  let inserted = 0;
  if (!historyExpired) {
    for (const messageId of newMessageIds) {
      const full = await gmail.users.messages.get({ userId: "me", id: messageId, format: "full" });
      const email = toRawEmail(full.data);

      if (!email.from.toLowerCase().includes("alerts@axis.bank.in")) continue;
      if (isKnownNonTransactional(email.subject)) continue;

      const parsed = parseAxisEmail(email);
      if (!parsed) continue; // left for the AI-fallback backstop poller

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
      // 23505 = unique violation on email_message_id — already ingested, fine.
      if (!error || error.code === "23505") {
        if (!error) inserted++;
      } else {
        throw error;
      }
    }
  }

  await supabaseServer
    .from("gmail_sync_state")
    .update({ history_id: String(latestHistoryId), updated_at: new Date().toISOString() })
    .eq("id", "singleton");

  return NextResponse.json({ ok: true, inserted, checked: newMessageIds.size, historyExpired });
}
