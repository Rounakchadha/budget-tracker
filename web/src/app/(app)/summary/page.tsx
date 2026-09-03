"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { getCategory } from "@/lib/categories";

interface CategoryTotal {
  category: string;
  total: number;
  count: number;
}

interface Summary {
  month: string;
  totalDebit: number;
  totalCredit: number;
  net: number;
  needsReviewCount: number;
  transactionCount: number;
  byCategory: CategoryTotal[];
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default function SummaryPage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    setSummary(null);
    fetch(`/api/summary?month=${month}`)
      .then((r) => r.json())
      .then(setSummary);
  }, [month]);

  const maxCategoryTotal = summary?.byCategory[0]?.total ?? 0;

  return (
    <div>
      <PageHeader title="Summary" />

      <div className="mb-4 flex items-center justify-center gap-4 px-5">
        <button onClick={() => setMonth((m) => shiftMonth(m, -1))} className="p-1" style={{ color: "var(--accent)" }}>
          <ChevronLeft size={22} />
        </button>
        <span className="min-w-[10ch] text-center text-[15px] font-medium" style={{ color: "var(--text)" }}>
          {monthLabel(month)}
        </span>
        <button onClick={() => setMonth((m) => shiftMonth(m, 1))} className="p-1" style={{ color: "var(--accent)" }}>
          <ChevronRight size={22} />
        </button>
      </div>

      {!summary && (
        <p className="px-5 text-[15px]" style={{ color: "var(--text-secondary)" }}>
          Loading…
        </p>
      )}

      {summary && (
        <div className="flex flex-col gap-6 px-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-4" style={{ background: "var(--card)" }}>
              <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                Spent
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums" style={{ color: "var(--debit)" }}>
                {formatMoney(summary.totalDebit)}
              </p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: "var(--card)" }}>
              <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                Received
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums" style={{ color: "var(--credit)" }}>
                {formatMoney(summary.totalCredit)}
              </p>
            </div>
          </div>

          {summary.needsReviewCount > 0 && (
            <div
              className="rounded-2xl px-4 py-3 text-[14px]"
              style={{ background: "var(--card)", color: "var(--text-secondary)" }}
            >
              {summary.needsReviewCount} transaction{summary.needsReviewCount === 1 ? "" : "s"} this month still{" "}
              {summary.needsReviewCount === 1 ? "needs" : "need"} a category
            </div>
          )}

          <div>
            <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
              By category
            </h2>
            {summary.byCategory.length === 0 ? (
              <p className="px-1 text-[15px]" style={{ color: "var(--text-secondary)" }}>
                No spending this month
              </p>
            ) : (
              <div className="overflow-hidden rounded-2xl" style={{ background: "var(--card)" }}>
                {summary.byCategory.map((c, i) => {
                  const cat = getCategory(c.category === "Uncategorized" ? null : c.category);
                  const pct = maxCategoryTotal > 0 ? (c.total / maxCategoryTotal) * 100 : 0;
                  return (
                    <div key={c.category}>
                      {i > 0 && <div className="ml-4 h-px" style={{ background: "var(--separator)" }} />}
                      <div className="px-4 py-3">
                        <div className="mb-1.5 flex items-center justify-between text-[15px]">
                          <span style={{ color: "var(--text)" }}>
                            {cat.emoji} {c.category}
                          </span>
                          <span className="font-medium tabular-nums" style={{ color: "var(--text)" }}>
                            {formatMoney(c.total)}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--pill-bg)" }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cat.color }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
