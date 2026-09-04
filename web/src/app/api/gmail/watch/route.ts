import { NextRequest, NextResponse } from "next/server";
import { getGmailClient } from "@/lib/gmail-webhook/client";
import { supabaseServer } from "@/lib/supabase-server";
import { timingSafeEqualStr } from "@/lib/session";

// (Re)subscribes to Gmail push notifications. Gmail watches expire after 7
// days, so this needs to run on a schedule (Vercel Cron, see vercel.json) —
// called daily to stay well inside that window. Also safe to hit manually
// once after first deploying, to start the subscription.
//
// GET because Vercel Cron Jobs only issue GET requests; POST works the same
// for a manual curl trigger.
async function handleWatch(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  if (!timingSafeEqualStr(authHeader, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const topicName = process.env.GMAIL_PUBSUB_TOPIC;
  if (!topicName) {
    return NextResponse.json({ error: "GMAIL_PUBSUB_TOPIC not configured" }, { status: 500 });
  }

  const gmail = getGmailClient();
  const res = await gmail.users.watch({
    userId: "me",
    requestBody: { topicName, labelIds: ["INBOX"] },
  });

  const { data: existing } = await supabaseServer
    .from("gmail_sync_state")
    .select("history_id")
    .eq("id", "singleton")
    .maybeSingle();

  await supabaseServer
    .from("gmail_sync_state")
    .update({
      // Only seed the cursor if we don't have one yet — don't clobber a
      // cursor that's ahead of this watch's starting point.
      history_id: existing?.history_id ?? String(res.data.historyId ?? ""),
      watch_expiration: res.data.expiration ? new Date(Number(res.data.expiration)).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", "singleton");

  return NextResponse.json({ ok: true, historyId: res.data.historyId, expiration: res.data.expiration });
}

export const GET = handleWatch;
export const POST = handleWatch;
