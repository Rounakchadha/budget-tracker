"use client";

import { useState } from "react";
import type { Split } from "@/lib/types";
import { BottomSheet, useBottomSheetClose } from "./BottomSheet";

export function EditSplitSheet({
  split,
  onClose,
  onSaved,
}: {
  split: Split;
  onClose: () => void;
  onSaved: (updated: Split) => void;
}) {
  return (
    <BottomSheet onClose={onClose}>
      <EditSplitForm split={split} onSaved={onSaved} />
    </BottomSheet>
  );
}

function EditSplitForm({ split, onSaved }: { split: Split; onSaved: (updated: Split) => void }) {
  const closeAnimated = useBottomSheetClose();

  const [personName, setPersonName] = useState(split.person_name);
  const [amount, setAmount] = useState(String(split.amount));
  const [direction, setDirection] = useState<"i_owe" | "owed_to_me">(split.direction);
  const [description, setDescription] = useState(split.description ?? "");
  const [date, setDate] = useState(split.date);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || !personName.trim()) return;

    setSaving(true);
    setError(null);
    const res = await fetch(`/api/splits/${split.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personName: personName.trim(),
        amount: parsedAmount,
        direction,
        description: description.trim() || null,
        date,
      }),
    });
    setSaving(false);

    if (!res.ok) {
      setError("Couldn't save — try again");
      return;
    }
    const { split: updated } = await res.json();
    onSaved(updated);
    closeAnimated();
  }

  return (
    <>
      <p className="mb-4 text-[15px] font-medium" style={{ color: "var(--text)" }}>
        Edit entry
      </p>

      <input
        placeholder="Person's name"
        value={personName}
        onChange={(e) => setPersonName(e.target.value)}
        className="mb-2.5 w-full rounded-xl px-3.5 py-2.5 text-base outline-none ring-1 ring-black/5"
        style={{ background: "var(--bg)", color: "var(--text)" }}
      />

      <input
        type="number"
        step="0.01"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="mb-2.5 w-full rounded-xl px-3.5 py-2.5 text-base outline-none ring-1 ring-black/5"
        style={{ background: "var(--bg)", color: "var(--text)" }}
      />

      <input
        placeholder="What for? (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="mb-2.5 w-full rounded-xl px-3.5 py-2.5 text-base outline-none ring-1 ring-black/5"
        style={{ background: "var(--bg)", color: "var(--text)" }}
      />

      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="mb-5 w-full rounded-xl px-3.5 py-2.5 text-base outline-none ring-1 ring-black/5"
        style={{ background: "var(--bg)", color: "var(--text)" }}
      />

      <div className="mb-6 grid grid-cols-2 gap-2">
        <button
          onClick={() => setDirection("owed_to_me")}
          className="rounded-xl py-2.5 text-[14px] font-medium"
          style={{
            background: direction === "owed_to_me" ? "var(--credit)" : "var(--bg)",
            color: direction === "owed_to_me" ? "#fff" : "var(--text)",
          }}
        >
          They owe me
        </button>
        <button
          onClick={() => setDirection("i_owe")}
          className="rounded-xl py-2.5 text-[14px] font-medium"
          style={{
            background: direction === "i_owe" ? "var(--debit)" : "var(--bg)",
            color: direction === "i_owe" ? "#fff" : "var(--text)",
          }}
        >
          I owe them
        </button>
      </div>

      {error && (
        <p className="mb-3 text-[13px]" style={{ color: "var(--debit)" }}>
          {error}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving || !amount || !personName.trim()}
        className="w-full rounded-2xl py-3.5 text-base font-medium text-white disabled:opacity-40"
        style={{ background: "var(--accent)" }}
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </>
  );
}
