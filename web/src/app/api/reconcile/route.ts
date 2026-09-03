import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { parseStatementRows, type StatementRow } from "@/lib/statement";
import type { Transaction } from "@/lib/types";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const body = await request.json();
  const rawRows = body.rows as Record<string, string>[];

  const { rows, unrecognizedHeaders } = parseStatementRows(rawRows);

  if (unrecognizedHeaders) {
    return NextResponse.json(
      {
        error: "Couldn't recognize the statement's columns.",
        detectedHeaders: unrecognizedHeaders,
      },
      { status: 422 }
    );
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "No transaction rows found in the file." }, { status: 422 });
  }

  const dates = rows.map((r) => new Date(r.date).getTime());
  const rangeStart = new Date(Math.min(...dates) - ONE_DAY_MS).toISOString();
  const rangeEnd = new Date(Math.max(...dates) + ONE_DAY_MS).toISOString();

  const { data, error } = await supabaseServer
    .from("transactions")
    .select("*")
    .gte("transaction_date", rangeStart)
    .lt("transaction_date", rangeEnd);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const dbTransactions = (data ?? []) as Transaction[];
  const usedIds = new Set<string>();

  const matched: Array<{ statementRow: StatementRow; transaction: Transaction }> = [];
  const missingFromApp: StatementRow[] = [];

  for (const row of rows) {
    const rowDate = new Date(row.date).getTime();

    const candidate = dbTransactions.find((t) => {
      if (usedIds.has(t.id)) return false;
      if (t.direction !== row.direction) return false;
      if (Math.abs(t.amount - row.amount) > 0.01) return false;
      return Math.abs(new Date(t.transaction_date).getTime() - rowDate) <= ONE_DAY_MS;
    });

    if (candidate) {
      usedIds.add(candidate.id);
      matched.push({ statementRow: row, transaction: candidate });
    } else {
      missingFromApp.push(row);
    }
  }

  const extraInApp = dbTransactions.filter((t) => !usedIds.has(t.id));

  return NextResponse.json({
    matchedCount: matched.length,
    missingFromApp,
    extraInApp,
  });
}
