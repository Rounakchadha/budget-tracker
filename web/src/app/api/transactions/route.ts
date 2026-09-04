import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { applyPendingMerchantRules } from "@/lib/merchant-rules";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const needsReview = searchParams.get("needsReview");
  const month = searchParams.get("month"); // "YYYY-MM"
  const limit = Number(searchParams.get("limit") ?? "200");

  try {
    await applyPendingMerchantRules();
  } catch (err) {
    console.error("applyPendingMerchantRules failed:", err);
  }

  let query = supabaseServer
    .from("transactions")
    .select("*")
    .order("transaction_date", { ascending: false })
    .limit(limit);

  if (needsReview === "true") {
    query = query.eq("needs_review", true);
  }

  if (month) {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "month must be in YYYY-MM format" }, { status: 400 });
    }
    const [year, m] = month.split("-").map(Number);
    if (m < 1 || m > 12) {
      return NextResponse.json({ error: "month must be in YYYY-MM format" }, { status: 400 });
    }
    const start = new Date(Date.UTC(year, m - 1, 1)).toISOString();
    const end = new Date(Date.UTC(year, m, 1)).toISOString();
    query = query.gte("transaction_date", start).lt("transaction_date", end);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ transactions: data });
}

// Manual entry — for when the bank alert email hasn't arrived yet (or never
// will). Marked source: "Manual" so it's identifiable if the real email
// shows up later and needs deleting to avoid double-counting.
export async function POST(request: Request) {
  const body = await request.json();
  const { amount, direction, merchant, category, transaction_date } = body;

  if (typeof amount !== "number" || amount <= 0) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }
  if (direction !== "debit" && direction !== "credit") {
    return NextResponse.json({ error: "direction must be 'debit' or 'credit'" }, { status: 400 });
  }
  if (typeof merchant !== "string" || !merchant.trim()) {
    return NextResponse.json({ error: "merchant is required" }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("transactions")
    .insert({
      email_message_id: `manual-${randomUUID()}`,
      amount,
      currency: "INR",
      direction,
      merchant_raw: merchant.trim(),
      merchant_clean: merchant.trim(),
      category: category || null,
      source: "Manual",
      transaction_date: transaction_date || new Date().toISOString(),
      parsed_confidence: "high",
      needs_review: !category,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ transaction: data });
}
