import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  const { data, error } = await supabaseServer
    .from("gmail_sync_state")
    .select("history_id, watch_expiration, updated_at")
    .eq("id", "singleton")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    connected: !!data?.history_id,
    lastSyncedAt: data?.updated_at ?? null,
    watchExpiresAt: data?.watch_expiration ?? null,
  });
}
