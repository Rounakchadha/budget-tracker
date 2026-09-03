import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  const { data, error } = await supabaseServer
    .from("bills")
    .select("*")
    .order("paid", { ascending: true })
    .order("due_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ bills: data });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, amount, due_date } = body;

  if (!name || !amount || !due_date) {
    return NextResponse.json({ error: "name, amount, and due_date are required" }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("bills")
    .insert({ name, amount, due_date, paid: false })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ bill: data });
}
