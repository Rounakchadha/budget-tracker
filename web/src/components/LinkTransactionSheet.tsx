"use client";

import { useEffect, useState } from "react";
import { BottomSheet, useBottomSheetClose } from "./BottomSheet";
import type { Split, Transaction } from "@/lib/types";

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function LinkTransactionSheet({
  split,
  onClose,
  onSettled,
}: {
  split: Split;
  onClose: () => void;
  onSettled: (updatedSplit: Split) => void;
}) {
  return (
    <BottomSheet onClose={onClose}>
      <LinkTransactionForm split={split} onSettled={onSettled} />
    </BottomSheet>
  );
}

function LinkTransactionForm({ split, onSettled }: { split: Split; onSettled: (updatedSplit: Split) => void }) {
  const closeAnimated = useBottomSheetClose();
  const [candidates, setCandidates] = useState<Transaction[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const wantDirection = split.direction === "owed_to_me" ? "credit" : "debit";

  useEffect(() => {
    fetch("/api/transactions?limit=150")
      .then((r) => r.json())
      .then((data: { transactions: Transaction[] }) => {
        const matches = (data.transactions ?? [])
          .filter((t) => t.direction === wantDirection && !t.is_transfer)
          .sort((a, b) => {
            const aDiff = Math.abs(a.amount - split.amount);
            const bDiff = Math.abs(b.amount - split.amount);
            if (aDiff !== bDiff) return aDiff - bDiff;
            return new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime();
          })
          .slice(0, 20);
        setCandidates(matches);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function finish(transactionId: string | null) {
    setSaving(true);

    if (transactionId) {
      await fetch(`/api/transactions/${transactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_transfer: true,
          transfer_note: split.description ? `${split.person_name} — ${split.description}` : split.person_name,
        }),
      });
    }

    const res = await fetch(`/api/splits/${split.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settled: true, linked_transaction_id: transactionId }),
    });

    setSaving(false);
    if (res.ok) {
      const { split: updated } = await res.json();
      onSettled(updated);
      closeAnimated();
    }
  }

  return (
    <>
      <p className="mb-1 text-[15px] font-medium" style={{ color: "var(--text)" }}>
        Mark {formatMoney(split.amount)} with {split.person_name} as paid
      </p>
      <p className="mb-4 text-[13px]" style={{ color: "var(--text-secondary)" }}>
        Was this the actual bank transaction? Linking it marks that transaction as a transfer — it won&apos;t count
        toward Total {wantDirection === "credit" ? "Received" : "Spent"} anymore, since it&apos;s a repayment, not
        real {wantDirection === "credit" ? "income" : "spending"}.
      </p>

      {candidates === null && (
        <p className="mb-4 text-[14px]" style={{ color: "var(--text-secondary)" }}>
          Looking for matching transactions…
        </p>
      )}

      {candidates !== null && candidates.length === 0 && (
        <p className="mb-4 text-[14px]" style={{ color: "var(--text-secondary)" }}>
          No recent unlinked transactions to match — you can just mark it settled below.
        </p>
      )}

      {candidates !== null && candidates.length > 0 && (
        <div className="mb-5 max-h-64 overflow-y-auto rounded-2xl" style={{ background: "var(--bg)" }}>
          {candidates.map((t, i) => {
            const selected = selectedId === t.id;
            return (
              <div key={t.id}>
                {i > 0 && <div className="ml-4 h-px" style={{ background: "var(--separator)" }} />}
                <button
                  onClick={() => setSelectedId(selected ? null : t.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <div
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] text-white"
                    style={{ background: selected ? "var(--accent)" : "var(--pill-bg)" }}
                  >
                    {selected && "✓"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px]" style={{ color: "var(--text)" }}>
                      {t.merchant_clean ?? t.merchant_raw}
                    </p>
                    <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                      {formatDate(t.transaction_date)}
                    </p>
                  </div>
                  <p className="shrink-0 text-[14px] font-medium tabular-nums" style={{ color: "var(--text)" }}>
                    {formatMoney(t.amount)}
                  </p>
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <button
          onClick={() => finish(selectedId)}
          disabled={saving || !selectedId}
          className="w-full rounded-2xl py-3.5 text-base font-medium text-white disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          {saving ? "Saving…" : "Link & Mark Settled"}
        </button>
        <button
          onClick={() => finish(null)}
          disabled={saving}
          className="w-full rounded-2xl py-3 text-[14px] font-medium disabled:opacity-40"
          style={{ background: "var(--pill-bg)", color: "var(--text)" }}
        >
          Just mark settled, no transaction
        </button>
      </div>
    </>
  );
}
