import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const period = request.nextUrl.searchParams.get("period") === "month" ? "month" : "all";

  const [
    { data: transactions, error: txError },
    { data: bills, error: billsError },
    { data: balanceRow, error: balanceError },
    { data: splits, error: splitsError },
  ] = await Promise.all([
    supabaseServer.from("transactions").select("amount, direction, transaction_date"),
    supabaseServer.from("bills").select("amount, paid").eq("paid", false),
    supabaseServer.from("account_balance").select("*").eq("id", "singleton").maybeSingle(),
    supabaseServer.from("splits").select("amount, direction, settled").eq("settled", false),
  ]);

  if (txError) return NextResponse.json({ error: txError.message }, { status: 500 });
  if (billsError) return NextResponse.json({ error: billsError.message }, { status: 500 });
  if (balanceError) return NextResponse.json({ error: balanceError.message }, { status: 500 });
  if (splitsError) return NextResponse.json({ error: splitsError.message }, { status: 500 });

  const now = new Date();
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const inPeriod = (dateIso: string) => period === "all" || new Date(dateIso).getTime() >= monthStart;

  let totalReceived = 0;
  let totalSpent = 0;
  for (const t of transactions ?? []) {
    if (!inPeriod(t.transaction_date)) continue;
    if (t.direction === "credit") totalReceived += t.amount;
    else totalSpent += t.amount;
  }

  // With an anchor set, Net Balance = anchor + everything since — not the
  // all-time sum, since we don't know the balance before ingestion started.
  let netBalance = totalReceived - totalSpent;
  if (balanceRow) {
    const asOf = new Date(balanceRow.as_of).getTime();
    let sinceAnchor = 0;
    for (const t of transactions ?? []) {
      if (new Date(t.transaction_date).getTime() <= asOf) continue;
      sinceAnchor += t.direction === "credit" ? t.amount : -t.amount;
    }
    netBalance = balanceRow.balance + sinceAnchor;
  }

  const billsToPay = (bills ?? []).reduce((sum, b) => sum + b.amount, 0);

  let splitsNet = 0;
  for (const s of splits ?? []) {
    splitsNet += s.direction === "owed_to_me" ? s.amount : -s.amount;
  }

  const round2 = (n: number) => Math.round(n * 100) / 100;

  return NextResponse.json({
    totalReceived: round2(totalReceived),
    totalSpent: round2(totalSpent),
    netBalance: round2(netBalance),
    balanceAnchored: !!balanceRow,
    balanceAsOf: balanceRow?.as_of ?? null,
    billsToPay: round2(billsToPay),
    billsCount: (bills ?? []).length,
    splitsNet: round2(splitsNet),
    splitsCount: (splits ?? []).length,
  });
}
