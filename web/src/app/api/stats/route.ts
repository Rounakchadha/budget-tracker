import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  const [{ data: transactions, error: txError }, { data: bills, error: billsError }] = await Promise.all([
    supabaseServer.from("transactions").select("amount, direction"),
    supabaseServer.from("bills").select("amount, paid").eq("paid", false),
  ]);

  if (txError) return NextResponse.json({ error: txError.message }, { status: 500 });
  if (billsError) return NextResponse.json({ error: billsError.message }, { status: 500 });

  let totalReceived = 0;
  let totalSpent = 0;
  for (const t of transactions ?? []) {
    if (t.direction === "credit") totalReceived += t.amount;
    else totalSpent += t.amount;
  }

  const billsToPay = (bills ?? []).reduce((sum, b) => sum + b.amount, 0);
  const round2 = (n: number) => Math.round(n * 100) / 100;

  return NextResponse.json({
    totalReceived: round2(totalReceived),
    totalSpent: round2(totalSpent),
    netBalance: round2(totalReceived - totalSpent),
    billsToPay: round2(billsToPay),
    billsCount: (bills ?? []).length,
  });
}
