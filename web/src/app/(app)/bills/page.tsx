"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import type { Bill } from "@/lib/types";

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
}

function formatDueDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  function refresh() {
    fetch("/api/bills")
      .then((r) => r.json())
      .then((data) => setBills(data.bills));
  }

  useEffect(refresh, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, amount: parseFloat(amount), due_date: dueDate }),
    });
    setSaving(false);
    if (res.ok) {
      setName("");
      setAmount("");
      setDueDate("");
      setFormOpen(false);
      refresh();
    }
  }

  async function togglePaid(bill: Bill) {
    setBills((prev) => prev?.map((b) => (b.id === bill.id ? { ...b, paid: !b.paid } : b)) ?? prev);
    await fetch(`/api/bills/${bill.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid: !bill.paid }),
    });
  }

  async function remove(bill: Bill) {
    setBills((prev) => prev?.filter((b) => b.id !== bill.id) ?? prev);
    await fetch(`/api/bills/${bill.id}`, { method: "DELETE" });
  }

  const unpaid = bills?.filter((b) => !b.paid) ?? [];
  const paid = bills?.filter((b) => b.paid) ?? [];

  return (
    <div>
      <PageHeader title="Bills" />

      <div className="px-4">
        {!formOpen ? (
          <button
            onClick={() => setFormOpen(true)}
            className="mb-5 flex w-full items-center justify-center gap-1.5 rounded-2xl py-3 text-[15px] font-medium text-white"
            style={{ background: "var(--accent)" }}
          >
            <Plus size={18} /> Add bill
          </button>
        ) : (
          <form onSubmit={handleAdd} className="mb-5 flex flex-col gap-2.5 rounded-2xl p-4" style={{ background: "var(--card)" }}>
            <input
              required
              placeholder="Bill name (e.g. Rent, Wifi)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl px-3.5 py-2.5 text-[15px] outline-none ring-1 ring-black/5"
              style={{ background: "var(--bg)", color: "var(--text)" }}
            />
            <input
              required
              type="number"
              step="0.01"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-xl px-3.5 py-2.5 text-[15px] outline-none ring-1 ring-black/5"
              style={{ background: "var(--bg)", color: "var(--text)" }}
            />
            <input
              required
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-xl px-3.5 py-2.5 text-[15px] outline-none ring-1 ring-black/5"
              style={{ background: "var(--bg)", color: "var(--text)" }}
            />
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="flex-1 rounded-xl py-2.5 text-[15px]"
                style={{ background: "var(--pill-bg)", color: "var(--text)" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-xl py-2.5 text-[15px] font-medium text-white disabled:opacity-40"
                style={{ background: "var(--accent)" }}
              >
                {saving ? "Adding…" : "Add"}
              </button>
            </div>
          </form>
        )}

        {bills === null && (
          <p className="text-[15px]" style={{ color: "var(--text-secondary)" }}>
            Loading…
          </p>
        )}

        {bills && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
                Unpaid ({unpaid.length})
              </h2>
              {unpaid.length === 0 ? (
                <p className="px-1 text-[15px]" style={{ color: "var(--text-secondary)" }}>
                  Nothing due 🎉
                </p>
              ) : (
                <div className="overflow-hidden rounded-2xl" style={{ background: "var(--card)" }}>
                  {unpaid.map((bill, i) => (
                    <div key={bill.id}>
                      {i > 0 && <div className="ml-4 h-px" style={{ background: "var(--separator)" }} />}
                      <div className="flex items-center gap-3 px-4 py-3">
                        <button
                          onClick={() => togglePaid(bill)}
                          className="h-5 w-5 shrink-0 rounded-full border-2"
                          style={{ borderColor: "var(--text-secondary)" }}
                          aria-label="Mark as paid"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px]" style={{ color: "var(--text)" }}>
                            {bill.name}
                          </p>
                          <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                            Due {formatDueDate(bill.due_date)}
                          </p>
                        </div>
                        <p className="shrink-0 text-[15px] font-medium tabular-nums" style={{ color: "var(--text)" }}>
                          {formatMoney(bill.amount)}
                        </p>
                        <button onClick={() => remove(bill)} className="shrink-0 p-1" style={{ color: "var(--text-secondary)" }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {paid.length > 0 && (
              <div>
                <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
                  Paid ({paid.length})
                </h2>
                <div className="overflow-hidden rounded-2xl" style={{ background: "var(--card)" }}>
                  {paid.map((bill, i) => (
                    <div key={bill.id}>
                      {i > 0 && <div className="ml-4 h-px" style={{ background: "var(--separator)" }} />}
                      <div className="flex items-center gap-3 px-4 py-3">
                        <button
                          onClick={() => togglePaid(bill)}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] text-white"
                          style={{ background: "var(--credit)" }}
                          aria-label="Mark as unpaid"
                        >
                          ✓
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px]" style={{ color: "var(--text-secondary)" }}>
                            {bill.name}
                          </p>
                        </div>
                        <p className="shrink-0 text-[15px] tabular-nums" style={{ color: "var(--text-secondary)" }}>
                          {formatMoney(bill.amount)}
                        </p>
                        <button onClick={() => remove(bill)} className="shrink-0 p-1" style={{ color: "var(--text-secondary)" }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
