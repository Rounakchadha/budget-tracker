"use client";

import { useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import type { Transaction } from "@/lib/types";

export function CategorySheet({
  transaction,
  onClose,
  onSaved,
}: {
  transaction: Transaction;
  onClose: () => void;
  onSaved: (updated: Transaction) => void;
}) {
  const [merchantClean, setMerchantClean] = useState(transaction.merchant_clean ?? transaction.merchant_raw);
  const [category, setCategory] = useState(transaction.category);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/transactions/${transaction.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_clean: merchantClean,
        category,
        needs_review: false,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const { transaction: updated } = await res.json();
      onSaved(updated);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl p-5 pb-[calc(env(safe-area-inset-bottom)+20px)]"
        style={{ background: "var(--card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full" style={{ background: "var(--separator)" }} />

        <p className="mb-1 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
          Merchant
        </p>
        <input
          value={merchantClean}
          onChange={(e) => setMerchantClean(e.target.value)}
          className="mb-5 w-full rounded-xl px-3.5 py-2.5 text-base outline-none ring-1 ring-black/5"
          style={{ background: "var(--bg)", color: "var(--text)" }}
        />

        <p className="mb-2 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
          Category
        </p>
        <div className="mb-6 grid grid-cols-3 gap-2">
          {CATEGORIES.map((c) => {
            const selected = category === c.name;
            return (
              <button
                key={c.name}
                onClick={() => setCategory(c.name)}
                className="flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-xs transition-transform active:scale-95"
                style={{
                  background: selected ? c.color : "var(--bg)",
                  color: selected ? "#fff" : "var(--text)",
                }}
              >
                <span className="text-xl">{c.emoji}</span>
                <span className="text-center leading-tight">{c.name}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !category}
          className="w-full rounded-2xl py-3.5 text-base font-medium text-white disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
