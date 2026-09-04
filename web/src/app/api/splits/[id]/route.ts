import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const update: Record<string, unknown> = {};
  if ("settled" in body) update.settled = body.settled;
  if ("personName" in body) update.person_name = body.personName;
  if ("amount" in body) update.amount = body.amount;
  if ("direction" in body) update.direction = body.direction;
  if ("description" in body) update.description = body.description;
  if ("date" in body) update.date = body.date;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await supabaseServer.from("splits").update(update).eq("id", id).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ split: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await supabaseServer.from("splits").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
