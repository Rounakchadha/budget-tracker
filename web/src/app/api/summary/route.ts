import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
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
  const start = new Date(Date.UTC(year, m - 1, 1)).toISOString();
  const end = new Date(Date.UTC(year, m, 1)).toISOString();

  const { data, error } = await supabaseServer
    .from("transactions")
    .select("*")
    .gte("transaction_date", start)
    .lt("transaction_date", end);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const transactions = (data ?? []) as Transaction[];

  let totalDebit = 0;
  let totalCredit = 0;
  let needsReviewCount = 0;
  const byCategory = new Map<string, { total: number; count: number; transactions: Transaction[] }>();

  for (const t of transactions) {
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
    if (t.needs_review) needsReviewCount++;
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
    net: totalCredit - totalDebit,
    needsReviewCount,
    transactionCount: transactions.length,
    byCategory: categories,
  });
}
