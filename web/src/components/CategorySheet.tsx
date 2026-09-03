"use client";

import { useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import type { Transaction } from "@/lib/types";

interface SimilarGroup {
  merchantRaw: string;
  count: number;
  ids: string[];
}

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
  const [applyToSimilar, setApplyToSimilar] = useState(false);
  const [saving, setSaving] = useState(false);

  const [step, setStep] = useState<"edit" | "confirm-similar">("edit");
  const [groups, setGroups] = useState<SimilarGroup[]>([]);
  const [checkedRaws, setCheckedRaws] = useState<Set<string>>(new Set());
  const [savedTransaction, setSavedTransaction] = useState<Transaction | null>(null);

  async function handleSave() {
    if (!category) return;
    setSaving(true);

    const res = await fetch(`/api/transactions/${transaction.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchant_clean: merchantClean, category, needs_review: false }),
    });

    if (!res.ok) {
      setSaving(false);
      return;
    }
    const { transaction: updated } = await res.json();

    if (!applyToSimilar) {
      onSaved(updated);
      return;
    }

    const similarRes = await fetch(
      `/api/transactions/similar?merchantRaw=${encodeURIComponent(transaction.merchant_raw)}&excludeId=${transaction.id}`
    );
    const similarData = await similarRes.json();
    setSaving(false);

    if (!similarRes.ok || (similarData.groups as SimilarGroup[]).length === 0) {
      onSaved(updated);
      return;
    }

    setSavedTransaction(updated);
    setGroups(similarData.groups);
    setCheckedRaws(new Set(similarData.groups.map((g: SimilarGroup) => g.merchantRaw)));
    setStep("confirm-similar");
  }

  async function handleConfirmSimilar() {
    setSaving(true);
    const applyToIds = groups.filter((g) => checkedRaws.has(g.merchantRaw)).flatMap((g) => g.ids);

    await fetch("/api/merchant-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sampleRaw: transaction.merchant_raw,
        merchantClean,
        category,
        applyToIds,
      }),
    });

    setSaving(false);
    onSaved(savedTransaction!);
  }

  function toggleRaw(raw: string) {
    setCheckedRaws((prev) => {
      const next = new Set(prev);
      if (next.has(raw)) next.delete(raw);
      else next.add(raw);
      return next;
    });
  }

  if (step === "confirm-similar") {
    const selectedCount = groups.filter((g) => checkedRaws.has(g.merchantRaw)).reduce((s, g) => s + g.count, 0);
    return (
      <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40" onClick={onClose}>
        <div
          className="w-full max-w-md rounded-t-3xl p-5 pb-[calc(env(safe-area-inset-bottom)+20px)]"
          style={{ background: "var(--card)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto mb-4 h-1 w-9 rounded-full" style={{ background: "var(--separator)" }} />

          <p className="mb-1 text-[15px] font-medium" style={{ color: "var(--text)" }}>
            Found {groups.reduce((s, g) => s + g.count, 0)} similar transaction{groups.length === 1 && groups[0].count === 1 ? "" : "s"}
          </p>
          <p className="mb-4 text-[13px]" style={{ color: "var(--text-secondary)" }}>
            Uncheck any that aren&apos;t actually {merchantClean}. Checked ones will be relabeled now, and future
            transactions like these will show up in Review pre-filled — one tap to confirm.
          </p>

          <div className="mb-5 overflow-hidden rounded-2xl" style={{ background: "var(--bg)" }}>
            {groups.map((g, i) => (
              <div key={g.merchantRaw}>
                {i > 0 && <div className="ml-4 h-px" style={{ background: "var(--separator)" }} />}
                <button
                  onClick={() => toggleRaw(g.merchantRaw)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <div
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] text-white"
                    style={{ background: checkedRaws.has(g.merchantRaw) ? "var(--accent)" : "var(--pill-bg)" }}
                  >
                    {checkedRaws.has(g.merchantRaw) && "✓"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px]" style={{ color: "var(--text)" }}>
                      {g.merchantRaw}
                    </p>
                  </div>
                  <p className="shrink-0 text-[13px]" style={{ color: "var(--text-secondary)" }}>
                    {g.count}×
                  </p>
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleConfirmSimilar}
            disabled={saving}
            className="w-full rounded-2xl py-3.5 text-base font-medium text-white disabled:opacity-40"
            style={{ background: "var(--accent)" }}
          >
            {saving ? "Applying…" : selectedCount > 0 ? `Apply to ${selectedCount} transaction${selectedCount === 1 ? "" : "s"}` : "Skip"}
          </button>
        </div>
      </div>
    );
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
          className="mb-3 w-full rounded-xl px-3.5 py-2.5 text-base outline-none ring-1 ring-black/5"
          style={{ background: "var(--bg)", color: "var(--text)" }}
        />

        <button
          onClick={() => setApplyToSimilar((v) => !v)}
          className="mb-5 flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-[13px]"
          style={{ background: "var(--bg)", color: "var(--text-secondary)" }}
        >
          <div
            className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md text-[10px] text-white"
            style={{ background: applyToSimilar ? "var(--accent)" : "var(--pill-bg)" }}
          >
            {applyToSimilar && "✓"}
          </div>
          Apply this name/category to similar transactions, and remember it for future ones
        </button>

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
