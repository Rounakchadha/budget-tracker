"use client";

import { useState } from "react";

export function BalanceEditSheet({
  currentValue,
  onClose,
  onSaved,
}: {
  currentValue: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(String(currentValue));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const parsed = parseFloat(value);
    if (!Number.isFinite(parsed)) return;
    setSaving(true);
    const res = await fetch("/api/settings/balance", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ balance: parsed }),
    });
    setSaving(false);
    if (res.ok) onSaved();
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
          Set current balance
        </p>
        <p className="mb-4 text-[13px]" style={{ color: "var(--text-secondary)" }}>
          Enter what your account actually has right now. Every transaction from this moment on is added/subtracted
          automatically — you won&apos;t need to re-enter this unless something drifts again.
        </p>

        <input
          type="number"
          step="0.01"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="mb-5 w-full rounded-xl px-3.5 py-2.5 text-base outline-none ring-1 ring-black/5"
          style={{ background: "var(--bg)", color: "var(--text)" }}
        />

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-2xl py-3.5 text-base font-medium text-white disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
