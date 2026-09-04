"use client";

import { useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import type { Transaction } from "@/lib/types";

function toDatetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AddTransactionSheet({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (created: Transaction) => void;
}) {
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"debit" | "credit">("debit");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [when, setWhen] = useState(() => toDatetimeLocal(new Date()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || !merchant.trim()) return;

    setSaving(true);
    setError(null);
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: parsedAmount,
        direction,
        merchant: merchant.trim(),
        category,
        transaction_date: new Date(when).toISOString(),
      }),
    });
    setSaving(false);

    if (!res.ok) {
      setError("Couldn't save — try again");
      return;
    }
    const { transaction } = await res.json();
    onAdded(transaction);
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl p-5 pb-[calc(env(safe-area-inset-bottom)+20px)]"
        style={{ background: "var(--card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full" style={{ background: "var(--separator)" }} />

        <p className="mb-1 text-[15px] font-medium" style={{ color: "var(--text)" }}>
          Add a payment
        </p>
        <p className="mb-4 text-[13px]" style={{ color: "var(--text-secondary)" }}>
          For when the bank email hasn&apos;t shown up yet. If it arrives later, delete this one to avoid
          double-counting.
        </p>

        <div className="mb-3 flex rounded-xl p-1" style={{ background: "var(--bg)" }}>
          {(["debit", "credit"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDirection(d)}
              className="flex-1 rounded-lg py-2 text-[14px] font-medium transition-colors"
              style={{
                background: direction === d ? (d === "debit" ? "var(--debit)" : "var(--credit)") : "transparent",
                color: direction === d ? "white" : "var(--text-secondary)",
              }}
            >
              {d === "debit" ? "Spent" : "Received"}
            </button>
          ))}
        </div>

        <input
          type="number"
          step="0.01"
          autoFocus
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mb-2.5 w-full rounded-xl px-3.5 py-2.5 text-base outline-none ring-1 ring-black/5"
          style={{ background: "var(--bg)", color: "var(--text)" }}
        />

        <input
          placeholder="Who was it for?"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          className="mb-2.5 w-full rounded-xl px-3.5 py-2.5 text-base outline-none ring-1 ring-black/5"
          style={{ background: "var(--bg)", color: "var(--text)" }}
        />

        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          className="mb-5 w-full rounded-xl px-3.5 py-2.5 text-base outline-none ring-1 ring-black/5"
          style={{ background: "var(--bg)", color: "var(--text)" }}
        />

        <p className="mb-2 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
          Category (optional)
        </p>
        <div className="mb-6 grid grid-cols-3 gap-2">
          {CATEGORIES.map((c) => {
            const selected = category === c.name;
            return (
              <button
                key={c.name}
                onClick={() => setCategory(selected ? null : c.name)}
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

        {error && (
          <p className="mb-3 text-[13px]" style={{ color: "var(--debit)" }}>
            {error}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !amount || !merchant.trim()}
          className="w-full rounded-2xl py-3.5 text-base font-medium text-white disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          {saving ? "Adding…" : "Add"}
        </button>
      </div>
    </div>
  );
}
