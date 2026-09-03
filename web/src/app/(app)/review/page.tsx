"use client";

import { useTransactions } from "@/lib/use-transactions";
import { TransactionList } from "@/components/TransactionList";
import { PageHeader } from "@/components/PageHeader";

export default function ReviewPage() {
  const { transactions, error, updateOne } = useTransactions("?needsReview=true");
  const pending = transactions?.filter((t) => t.needs_review) ?? null;

  return (
    <div>
      <PageHeader
        title="Review"
        subtitle={pending && pending.length > 0 ? `${pending.length} transaction${pending.length === 1 ? "" : "s"} need a category` : undefined}
      />
      {error && (
        <p className="px-5 text-[15px]" style={{ color: "var(--debit)" }}>
          {error}
        </p>
      )}
      {!error && pending === null && (
        <p className="px-5 text-[15px]" style={{ color: "var(--text-secondary)" }}>
          Loading…
        </p>
      )}
      {pending && (
        <TransactionList transactions={pending} onUpdate={updateOne} emptyMessage="Nothing needs review 🎉" />
      )}
    </div>
  );
}
