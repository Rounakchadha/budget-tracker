import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const needsReview = searchParams.get("needsReview");
  const month = searchParams.get("month"); // "YYYY-MM"
  const limit = Number(searchParams.get("limit") ?? "200");

  let query = supabaseServer
    .from("transactions")
    .select("*")
    .order("transaction_date", { ascending: false })
    .limit(limit);

  if (needsReview === "true") {
    query = query.eq("needs_review", true);
  }

  if (month) {
    const [year, m] = month.split("-").map(Number);
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
