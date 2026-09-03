"use client";

import { useTransactions } from "@/lib/use-transactions";
import { TransactionList } from "@/components/TransactionList";
import { PageHeader } from "@/components/PageHeader";
import { StatsGrid } from "@/components/StatsGrid";

export default function ActivityPage() {
  const { transactions, error, updateOne } = useTransactions("");

  return (
    <div>
      <PageHeader title="Activity" />
      <StatsGrid />
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
        <TransactionList transactions={transactions} onUpdate={updateOne} emptyMessage="No transactions yet" />
      )}
    </div>
  );
}
