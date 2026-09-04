"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useTransactions } from "@/lib/use-transactions";
import { TransactionList } from "@/components/TransactionList";
import { PageHeader } from "@/components/PageHeader";
import { StatsGrid } from "@/components/StatsGrid";
import { AddTransactionSheet } from "@/components/AddTransactionSheet";

export default function ActivityPage() {
  const { transactions, error, updateOne, addOne, removeOne } = useTransactions("");
  const [adding, setAdding] = useState(false);

  return (
    <div>
      <PageHeader title="Activity" />
      <StatsGrid />

      <div className="px-4 pb-2">
        <button
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl py-3 text-[15px] font-medium text-white active:opacity-80"
          style={{ background: "var(--accent)" }}
        >
          <Plus size={18} /> Add payment
        </button>
      </div>

      {error && (
        <p className="px-5 text-[15px]" style={{ color: "var(--debit)" }}>
          {error}
        </p>
      )}
      {!error && transactions === null && (
        <p className="px-5 text-[15px]" style={{ color: "var(--text-secondary)" }}>
          Loading…
        </p>
      )}
      {transactions && (
        <TransactionList
          transactions={transactions}
          onUpdate={updateOne}
          onDelete={removeOne}
          emptyMessage="No transactions yet"
        />
      )}

      {adding && (
        <AddTransactionSheet
          onClose={() => setAdding(false)}
          onAdded={(created) => {
            addOne(created);
            setAdding(false);
          }}
        />
      )}
    </div>
  );
}
