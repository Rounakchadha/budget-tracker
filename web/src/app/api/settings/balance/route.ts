import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  const { data, error } = await supabaseServer.from("account_balance").select("*").eq("id", "singleton").maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ balance: data });
}

export async function PUT(request: Request) {
  const { balance } = await request.json();

  if (typeof balance !== "number" || !Number.isFinite(balance)) {
    return NextResponse.json({ error: "balance must be a number" }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("account_balance")
    .upsert({ id: "singleton", balance, as_of: new Date().toISOString() })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ balance: data });
}
