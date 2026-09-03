import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { isSimilarMerchant } from "@/lib/similarity";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const merchantRaw = searchParams.get("merchantRaw");
  const excludeId = searchParams.get("excludeId");

  if (!merchantRaw) {
    return NextResponse.json({ error: "merchantRaw is required" }, { status: 400 });
  }

  const { data, error } = await supabaseServer.from("transactions").select("id, merchant_raw");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const matches = (data ?? []).filter(
    (t) => t.id !== excludeId && isSimilarMerchant(t.merchant_raw, merchantRaw)
  );

  const grouped = new Map<string, string[]>();
  for (const m of matches) {
    if (!grouped.has(m.merchant_raw)) grouped.set(m.merchant_raw, []);
    grouped.get(m.merchant_raw)!.push(m.id);
  }

  const groups = Array.from(grouped.entries()).map(([merchantRawValue, ids]) => ({
    merchantRaw: merchantRawValue,
    count: ids.length,
    ids,
  }));

  return NextResponse.json({ groups, totalCount: matches.length });
}
