import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  const { data, error } = await supabaseServer
    .from("splits")
    .select("*")
    .order("settled", { ascending: true })
    .order("date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ splits: data });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { personName, amount, direction, description, date } = body;

  if (!personName || !amount || !direction) {
    return NextResponse.json({ error: "personName, amount, and direction are required" }, { status: 400 });
  }
  if (direction !== "i_owe" && direction !== "owed_to_me") {
    return NextResponse.json({ error: "direction must be 'i_owe' or 'owed_to_me'" }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("splits")
    .insert({
      person_name: personName,
      amount,
      direction,
      description: description || null,
      date: date || new Date().toISOString().slice(0, 10),
      settled: false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ split: data });
}
