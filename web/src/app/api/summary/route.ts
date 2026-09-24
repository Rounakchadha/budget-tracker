import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { effectiveMonth, shiftMonth } from "@/lib/month";
import type { Transaction } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month must be in YYYY-MM format" }, { status: 400 });
  }
  const [year, m] = month.split("-").map(Number);
  if (m < 1 || m > 12) {
    return NextResponse.json({ error: "month must be in YYYY-MM format" }, { status: 400 });
  }

  // Query a month on either side too, since attributed_month can pull a
  // transaction in/out of the requested month regardless of its real date.
  function firstOfMonth(monthStr: string): Date {
    const [y, mm] = monthStr.split("-").map(Number);
    return new Date(Date.UTC(y, mm - 1, 1));
  }
  const queryStart = firstOfMonth(shiftMonth(month, -1));
  const queryEnd = firstOfMonth(shiftMonth(month, 2));

  const { data, error } = await supabaseServer
    .from("transactions")
    .select("*")
    .eq("archived", false)
    .gte("transaction_date", queryStart.toISOString())
    .lt("transaction_date", queryEnd.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const transactions = ((data ?? []) as Transaction[]).filter((t) => effectiveMonth(t) === month);

  let totalDebit = 0;
  let totalCredit = 0;
  let totalTransfers = 0;
  let needsReviewCount = 0;
  const byCategory = new Map<string, { total: number; count: number; transactions: Transaction[] }>();

  for (const t of transactions) {
    if (t.needs_review) needsReviewCount++;

    if (t.is_transfer) {
      totalTransfers += t.amount;
      continue;
    }

    if (t.direction === "debit") {
      totalDebit += t.amount;
      const key = t.category ?? "Uncategorized";
      const existing = byCategory.get(key) ?? { total: 0, count: 0, transactions: [] };
      existing.total += t.amount;
      existing.count += 1;
      existing.transactions.push(t);
      byCategory.set(key, existing);
    } else {
      totalCredit += t.amount;
    }
  }

  const categories = Array.from(byCategory.entries())
    .map(([category, v]) => ({
      category,
      total: v.total,
      count: v.count,
      transactions: v.transactions.sort(
        (a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
      ),
    }))
    .sort((a, b) => b.total - a.total);

  return NextResponse.json({
    month,
    totalDebit,
    totalCredit,
    totalTransfers,
    net: totalCredit - totalDebit,
    needsReviewCount,
    transactionCount: transactions.length,
    byCategory: categories,
  });
}
