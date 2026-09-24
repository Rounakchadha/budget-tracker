import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { currentMonth, effectiveMonth } from "@/lib/month";

export async function GET(request: NextRequest) {
  const period = request.nextUrl.searchParams.get("period") === "month" ? "month" : "all";

  const [
    { data: transactions, error: txError },
    { data: bills, error: billsError },
    { data: balanceRow, error: balanceError },
    { data: splits, error: splitsError },
  ] = await Promise.all([
    supabaseServer
      .from("transactions")
      .select("amount, direction, transaction_date, is_transfer, attributed_month"),
    supabaseServer.from("bills").select("amount, paid, due_date").eq("paid", false),
    supabaseServer.from("account_balance").select("*").eq("id", "singleton").maybeSingle(),
    supabaseServer.from("splits").select("amount, direction, settled").eq("settled", false),
  ]);

  if (txError) return NextResponse.json({ error: txError.message }, { status: 500 });
  if (billsError) return NextResponse.json({ error: billsError.message }, { status: 500 });
  if (balanceError) return NextResponse.json({ error: balanceError.message }, { status: 500 });
  if (splitsError) return NextResponse.json({ error: splitsError.message }, { status: 500 });

  const now = new Date();
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const monthEnd = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  const thisMonth = currentMonth();
  // Reporting totals (Received/Spent/Transfers) use attributed_month when
  // set, so salary etc. can be nudged into the "right" month for reporting.
  const inReportingPeriod = (t: { transaction_date: string; attributed_month: string | null }) =>
    period === "all" || effectiveMonth(t) === thisMonth;
  const dueInPeriod = (dueDate: string) => {
    if (period === "all") return true;
    const t = new Date(`${dueDate}T00:00:00Z`).getTime();
    return t >= monthStart && t < monthEnd;
  };

  let totalReceived = 0;
  let totalSpent = 0;
  let totalTransfers = 0;
  let reportingNet = 0; // full credit-debit sum for the reporting period, transfers included — this IS Net Balance when unanchored
  for (const t of transactions ?? []) {
    if (!inReportingPeriod(t)) continue;
    reportingNet += t.direction === "credit" ? t.amount : -t.amount;
    if (t.is_transfer) {
      totalTransfers += t.amount;
      continue;
    }
    if (t.direction === "credit") totalReceived += t.amount;
    else totalSpent += t.amount;
  }

  // Net Balance always reflects real money movement (including transfers —
  // a split repayment genuinely changes your balance), anchored to the real
  // transaction_date, never the reporting-only attributed_month.
  let netBalance = reportingNet;
  if (balanceRow) {
    const asOf = new Date(balanceRow.as_of).getTime();
    let sinceAnchor = 0;
    for (const t of transactions ?? []) {
      if (new Date(t.transaction_date).getTime() <= asOf) continue;
      sinceAnchor += t.direction === "credit" ? t.amount : -t.amount;
    }
    netBalance = balanceRow.balance + sinceAnchor;
  }

  const billsDue = (bills ?? []).filter((b) => dueInPeriod(b.due_date));
  const billsToPay = billsDue.reduce((sum, b) => sum + b.amount, 0);

  let splitsNet = 0;
  for (const s of splits ?? []) {
    splitsNet += s.direction === "owed_to_me" ? s.amount : -s.amount;
  }

  const round2 = (n: number) => Math.round(n * 100) / 100;

  return NextResponse.json({
    totalReceived: round2(totalReceived),
    totalSpent: round2(totalSpent),
    totalTransfers: round2(totalTransfers),
    netBalance: round2(netBalance),
    balanceAnchored: !!balanceRow,
    balanceAsOf: balanceRow?.as_of ?? null,
    billsToPay: round2(billsToPay),
    billsCount: billsDue.length,
    splitsNet: round2(splitsNet),
    splitsCount: (splits ?? []).length,
  });
}
