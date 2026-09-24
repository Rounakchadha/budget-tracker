"use client";

import { useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import type { Transaction } from "@/lib/types";
import { effectiveMonth, shiftMonth } from "@/lib/month";
import { BottomSheet, useBottomSheetClose } from "./BottomSheet";

interface SimilarGroup {
  merchantRaw: string;
  count: number;
  ids: string[];
}

function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export function CategorySheet({
  transaction,
  onClose,
  onSaved,
  onDeleted,
}: {
  transaction: Transaction;
  onClose: () => void;
  onSaved: (updated: Transaction) => void;
  onDeleted?: (id: string) => void;
}) {
  const [merchantClean, setMerchantClean] = useState(transaction.merchant_clean ?? transaction.merchant_raw);
  const [category, setCategory] = useState(transaction.category);
  const [step, setStep] = useState<"edit" | "confirm-salary-month" | "confirm-similar">("edit");
  const [groups, setGroups] = useState<SimilarGroup[]>([]);
  const [checkedRaws, setCheckedRaws] = useState<Set<string>>(new Set());
  const [savedTransaction, setSavedTransaction] = useState<Transaction | null>(null);
  const [pendingAttributedMonth, setPendingAttributedMonth] = useState<string | null>(null);

  if (step === "confirm-salary-month") {
    const realMonth = effectiveMonth({ transaction_date: transaction.transaction_date, attributed_month: null });
    const nextMonth = shiftMonth(realMonth, 1);
    return (
      <BottomSheet onClose={onClose}>
        <SalaryMonthConfirm
          nextMonthLabel={monthLabel(nextMonth)}
          onChoice={(useNext) => {
            setPendingAttributedMonth(useNext ? nextMonth : null);
            setStep("edit");
          }}
        />
      </BottomSheet>
    );
  }

  if (step === "confirm-similar") {
    return (
      <BottomSheet onClose={onClose}>
        <ConfirmSimilarForm
          merchantClean={merchantClean}
          category={category}
          sampleRaw={transaction.merchant_raw}
          groups={groups}
          checkedRaws={checkedRaws}
          setCheckedRaws={setCheckedRaws}
          savedTransaction={savedTransaction}
          onSaved={onSaved}
        />
      </BottomSheet>
    );
  }

  return (
    <BottomSheet onClose={onClose}>
      <CategoryEditForm
        transaction={transaction}
        merchantClean={merchantClean}
        setMerchantClean={setMerchantClean}
        category={category}
        setCategory={setCategory}
        pendingAttributedMonth={pendingAttributedMonth}
        setPendingAttributedMonth={setPendingAttributedMonth}
        onSaved={onSaved}
        onDeleted={onDeleted}
        onNeedsSalaryMonthConfirm={() => setStep("confirm-salary-month")}
        onNeedsSimilarConfirm={(updated, matchedGroups) => {
          setSavedTransaction(updated);
          setGroups(matchedGroups);
          setCheckedRaws(new Set(matchedGroups.map((g) => g.merchantRaw)));
          setStep("confirm-similar");
        }}
      />
    </BottomSheet>
  );
}

function SalaryMonthConfirm({ nextMonthLabel, onChoice }: { nextMonthLabel: string; onChoice: (useNext: boolean) => void }) {
  return (
    <>
      <p className="mb-1 text-[15px] font-medium" style={{ color: "var(--text)" }}>
        Count this as {nextMonthLabel}&apos;s salary?
      </p>
      <p className="mb-5 text-[13px]" style={{ color: "var(--text-secondary)" }}>
        This landed near month-end — if it's really next month's pay, it can count toward {nextMonthLabel} in Summary
        instead of the month it actually arrived in.
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onChoice(false)}
          className="flex-1 rounded-2xl py-3 text-[14px] font-medium"
          style={{ background: "var(--pill-bg)", color: "var(--text)" }}
        >
          No, keep as-is
        </button>
        <button
          onClick={() => onChoice(true)}
          className="flex-1 rounded-2xl py-3 text-[14px] font-medium text-white"
          style={{ background: "var(--accent)" }}
        >
          Yes, {nextMonthLabel}
        </button>
      </div>
    </>
  );
}

function CategoryEditForm({
  transaction,
  merchantClean,
  setMerchantClean,
  category,
  setCategory,
  pendingAttributedMonth,
  setPendingAttributedMonth,
  onSaved,
  onDeleted,
  onNeedsSalaryMonthConfirm,
  onNeedsSimilarConfirm,
}: {
  transaction: Transaction;
  merchantClean: string;
  setMerchantClean: (v: string) => void;
  category: string | null;
  setCategory: (v: string) => void;
  pendingAttributedMonth: string | null;
  setPendingAttributedMonth: (v: string | null) => void;
  onSaved: (updated: Transaction) => void;
  onDeleted?: (id: string) => void;
  onNeedsSalaryMonthConfirm: () => void;
  onNeedsSimilarConfirm: (updated: Transaction, groups: SimilarGroup[]) => void;
}) {
  const closeAnimated = useBottomSheetClose();
  const [applyToSimilar, setApplyToSimilar] = useState(false);
  const [isTransfer, setIsTransfer] = useState(transaction.is_transfer);
  const [transferNote, setTransferNote] = useState(transaction.transfer_note ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const attributedMonth = pendingAttributedMonth ?? transaction.attributed_month;
  const realMonth = effectiveMonth({ transaction_date: transaction.transaction_date, attributed_month: null });
  const currentEffectiveMonth = attributedMonth ?? realMonth;

  const txDay = new Date(transaction.transaction_date).getUTCDate();
  const salaryMonthAlreadyDecided = pendingAttributedMonth !== null || transaction.attributed_month !== null;

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/transactions/${transaction.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      onDeleted?.(transaction.id);
      closeAnimated();
    }
  }

  async function doSave() {
    setSaving(true);

    const res = await fetch(`/api/transactions/${transaction.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_clean: merchantClean,
        category,
        needs_review: false,
        is_transfer: isTransfer,
        transfer_note: isTransfer ? transferNote || null : null,
        attributed_month: attributedMonth,
      }),
    });

    if (!res.ok) {
      setSaving(false);
      return;
    }
    const { transaction: updated } = await res.json();

    if (!applyToSimilar) {
      onSaved(updated);
      closeAnimated();
      return;
    }

    const similarRes = await fetch(
      `/api/transactions/similar?merchantRaw=${encodeURIComponent(transaction.merchant_raw)}&excludeId=${transaction.id}`
    );
    const similarData = await similarRes.json();
    setSaving(false);

    if (!similarRes.ok || (similarData.groups as SimilarGroup[]).length === 0) {
      onSaved(updated);
      closeAnimated();
      return;
    }

    onNeedsSimilarConfirm(updated, similarData.groups);
  }

  async function handleSave() {
    if (!category) return;

    if (category === "Salary" && !salaryMonthAlreadyDecided && txDay >= 25) {
      onNeedsSalaryMonthConfirm();
      return;
    }

    await doSave();
  }

  return (
    <>
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
        className="mb-3 flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-[13px]"
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

      <button
        onClick={() => setIsTransfer((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-[13px]"
        style={{ background: "var(--bg)", color: "var(--text-secondary)" }}
      >
        <div
          className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md text-[10px] text-white"
          style={{ background: isTransfer ? "var(--accent)" : "var(--pill-bg)" }}
        >
          {isTransfer && "✓"}
        </div>
        This is a transfer (split repayment, paying/paid back for someone) — not real income or spending
      </button>

      {isTransfer && (
        <input
          value={transferNote}
          onChange={(e) => setTransferNote(e.target.value)}
          placeholder="Who's this with? (optional, e.g. Vihaan)"
          className="mt-2 w-full rounded-xl px-3.5 py-2.5 text-[14px] outline-none ring-1 ring-black/5"
          style={{ background: "var(--bg)", color: "var(--text)" }}
        />
      )}

      <div className="mb-5 mt-3 flex items-center justify-between rounded-xl px-3.5 py-2.5" style={{ background: "var(--bg)" }}>
        <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
          Counts toward
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPendingAttributedMonth(shiftMonth(currentEffectiveMonth, -1))}
            className="px-1 text-[15px]"
            style={{ color: "var(--accent)" }}
          >
            ‹
          </button>
          <span className="min-w-[11ch] text-center text-[13px] font-medium" style={{ color: "var(--text)" }}>
            {monthLabel(currentEffectiveMonth)}
          </span>
          <button
            onClick={() => setPendingAttributedMonth(shiftMonth(currentEffectiveMonth, 1))}
            className="px-1 text-[15px]"
            style={{ color: "var(--accent)" }}
          >
            ›
          </button>
          {currentEffectiveMonth !== realMonth && (
            <button onClick={() => setPendingAttributedMonth(null)} className="text-[12px] underline" style={{ color: "var(--text-secondary)" }}>
              Reset
            </button>
          )}
        </div>
      </div>

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

      {transaction.source === "Manual" && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="mt-3 w-full rounded-2xl py-3 text-[14px] font-medium disabled:opacity-40"
          style={{ color: "var(--debit)" }}
        >
          {deleting ? "Deleting…" : "Delete this entry"}
        </button>
      )}
    </>
  );
}

function ConfirmSimilarForm({
  merchantClean,
  category,
  sampleRaw,
  groups,
  checkedRaws,
  setCheckedRaws,
  savedTransaction,
  onSaved,
}: {
  merchantClean: string;
  category: string | null;
  sampleRaw: string;
  groups: SimilarGroup[];
  checkedRaws: Set<string>;
  setCheckedRaws: React.Dispatch<React.SetStateAction<Set<string>>>;
  savedTransaction: Transaction | null;
  onSaved: (updated: Transaction) => void;
}) {
  const closeAnimated = useBottomSheetClose();
  const [saving, setSaving] = useState(false);

  function toggleRaw(raw: string) {
    setCheckedRaws((prev) => {
      const next = new Set(prev);
      if (next.has(raw)) next.delete(raw);
      else next.add(raw);
      return next;
    });
  }

  async function handleConfirmSimilar() {
    setSaving(true);
    const applyToIds = groups.filter((g) => checkedRaws.has(g.merchantRaw)).flatMap((g) => g.ids);

    await fetch("/api/merchant-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sampleRaw,
        merchantClean,
        category,
        applyToIds,
      }),
    });

    setSaving(false);
    onSaved(savedTransaction!);
    closeAnimated();
  }

  const selectedCount = groups.filter((g) => checkedRaws.has(g.merchantRaw)).reduce((s, g) => s + g.count, 0);

  return (
    <>
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
    </>
  );
}
