"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/Skeleton";
import { getCategory } from "@/lib/categories";
import type { Transaction } from "@/lib/types";

interface CategoryTotal {
  category: string;
  total: number;
  count: number;
  transactions: Transaction[];
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

function formatMoneyPrecise(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSummary(null);
    setExpanded(new Set());
    fetch(`/api/summary?month=${month}`)
      .then((r) => r.json())
      .then(setSummary);
  }, [month]);

  function toggleExpanded(category: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

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
        <div className="flex flex-col gap-6 px-4">
          <div className="grid grid-cols-2 gap-3">
            {[0, 1].map((i) => (
              <div key={i} className="flex flex-col gap-2 rounded-2xl p-4" style={{ background: "var(--card)" }}>
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-7 w-20" />
              </div>
            ))}
          </div>
          <div className="overflow-hidden rounded-2xl" style={{ background: "var(--card)" }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i}>
                {i > 0 && <div className="ml-4 h-px" style={{ background: "var(--separator)" }} />}
                <div className="px-4 py-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3.5 w-14" />
                  </div>
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
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
                  const isOpen = expanded.has(c.category);
                  return (
                    <div key={c.category}>
                      {i > 0 && <div className="ml-4 h-px" style={{ background: "var(--separator)" }} />}
                      <button onClick={() => toggleExpanded(c.category)} className="block w-full px-4 py-3 text-left">
                        <div className="mb-1.5 flex items-center justify-between text-[15px]">
                          <span className="flex items-center gap-1.5" style={{ color: "var(--text)" }}>
                            {cat.emoji} {c.category}
                            <ChevronDown
                              size={14}
                              style={{
                                color: "var(--text-secondary)",
                                transform: isOpen ? "rotate(180deg)" : "none",
                                transition: "transform 0.15s",
                              }}
                            />
                          </span>
                          <span className="font-medium tabular-nums" style={{ color: "var(--text)" }}>
                            {formatMoney(c.total)}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--pill-bg)" }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cat.color }} />
                        </div>
                      </button>

                      {isOpen && (
                        <div className="pb-2" style={{ background: "var(--bg)" }}>
                          {c.transactions.map((t, ti) => (
                            <div key={t.id}>
                              {ti > 0 && <div className="ml-8 h-px" style={{ background: "var(--separator)" }} />}
                              <div className="flex items-center justify-between px-4 py-2.5 pl-8">
                                <div className="min-w-0">
                                  <p className="truncate text-[14px]" style={{ color: "var(--text)" }}>
                                    {t.merchant_clean ?? t.merchant_raw}
                                  </p>
                                  <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                                    {formatDateTime(t.transaction_date)}
                                  </p>
                                </div>
                                <p className="shrink-0 text-[14px] tabular-nums" style={{ color: "var(--text)" }}>
                                  {formatMoneyPrecise(t.amount)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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
