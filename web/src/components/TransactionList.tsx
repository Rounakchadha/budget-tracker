"use client";

import type { Transaction } from "@/lib/types";
import { TransactionCard } from "./TransactionCard";

function dateHeading(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
}

export function TransactionList({
  transactions,
  onUpdate,
  emptyMessage = "No transactions",
}: {
  transactions: Transaction[];
  onUpdate: (updated: Transaction) => void;
  emptyMessage?: string;
}) {
  if (transactions.length === 0) {
    return (
      <p className="px-4 py-16 text-center text-[15px]" style={{ color: "var(--text-secondary)" }}>
        {emptyMessage}
      </p>
    );
  }

  const groups = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const key = dateHeading(t.transaction_date);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  return (
    <div className="flex flex-col gap-6 px-4">
      {Array.from(groups.entries()).map(([heading, items]) => (
        <div key={heading}>
          <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
            {heading}
          </h2>
          <div className="overflow-hidden rounded-2xl" style={{ background: "var(--card)" }}>
            {items.map((t, i) => (
              <div key={t.id}>
                {i > 0 && <div className="ml-16 h-px" style={{ background: "var(--separator)" }} />}
                <TransactionCard transaction={t} onUpdate={onUpdate} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
