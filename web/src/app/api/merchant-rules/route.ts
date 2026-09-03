import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const body = await request.json();
  const { sampleRaw, merchantClean, category, applyToIds } = body as {
    sampleRaw: string;
    merchantClean: string;
    category: string;
    applyToIds: string[];
  };

  if (!sampleRaw || !merchantClean || !category) {
    return NextResponse.json({ error: "sampleRaw, merchantClean, and category are required" }, { status: 400 });
  }

  const { data: rule, error: ruleError } = await supabaseServer
    .from("merchant_rules")
    .insert({ sample_raw: sampleRaw, merchant_clean: merchantClean, category })
    .select()
    .single();

  if (ruleError) {
    return NextResponse.json({ error: ruleError.message }, { status: 500 });
  }

  if (applyToIds && applyToIds.length > 0) {
    const { error: updateError } = await supabaseServer
      .from("transactions")
      .update({ merchant_clean: merchantClean, category, needs_review: false })
      .in("id", applyToIds);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ rule, appliedCount: applyToIds?.length ?? 0 });
}
