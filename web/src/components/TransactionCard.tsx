"use client";

import { useState } from "react";
import type { Transaction } from "@/lib/types";
import { getCategory } from "@/lib/categories";
import { CategorySheet } from "./CategorySheet";

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export function TransactionCard({
  transaction,
  onUpdate,
  onDelete,
}: {
  transaction: Transaction;
  onUpdate: (updated: Transaction) => void;
  onDelete?: (id: string) => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const category = getCategory(transaction.category);
  const displayName = transaction.merchant_clean ?? transaction.merchant_raw;

  return (
    <>
      <button
        onClick={() => setSheetOpen(true)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left active:opacity-60"
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
          style={{ background: transaction.category ? category.color : "var(--pill-bg)" }}
        >
          {transaction.category ? category.emoji : "❔"}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium" style={{ color: "var(--text)" }}>
            {displayName}
          </p>
          <p className="truncate text-[13px]" style={{ color: "var(--text-secondary)" }}>
            {transaction.source} · {formatTime(transaction.transaction_date)}
            {transaction.needs_review && (
              <span className="ml-1.5 font-medium" style={{ color: "var(--debit)" }}>
                · Needs review
              </span>
            )}
          </p>
        </div>

        <p
          className="shrink-0 text-[15px] font-semibold tabular-nums"
          style={{ color: transaction.direction === "credit" ? "var(--credit)" : "var(--text)" }}
        >
          {transaction.direction === "credit" ? "+" : "−"}
          {formatAmount(transaction.amount, transaction.currency)}
        </p>
      </button>

      {sheetOpen && (
        <CategorySheet
          transaction={transaction}
          onClose={() => setSheetOpen(false)}
          onSaved={(updated) => onUpdate(updated)}
          onDeleted={(id) => onDelete?.(id)}
        />
      )}
    </>
  );
}
