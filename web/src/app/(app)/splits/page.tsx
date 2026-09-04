"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import type { Split } from "@/lib/types";

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
}

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

interface PersonGroup {
  personName: string;
  net: number; // positive = they owe you, negative = you owe them
  entries: Split[];
}

function groupByPerson(splits: Split[]): PersonGroup[] {
  const map = new Map<string, Split[]>();
  for (const s of splits) {
    if (!map.has(s.person_name)) map.set(s.person_name, []);
    map.get(s.person_name)!.push(s);
  }

  return Array.from(map.entries())
    .map(([personName, entries]) => {
      const net = entries
        .filter((e) => !e.settled)
        .reduce((sum, e) => sum + (e.direction === "owed_to_me" ? e.amount : -e.amount), 0);
      return { personName, net, entries };
    })
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
}

export default function SplitsPage() {
  const [splits, setSplits] = useState<Split[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [personName, setPersonName] = useState("");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"i_owe" | "owed_to_me">("owed_to_me");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  function refresh() {
    fetch("/api/splits")
      .then((r) => r.json())
      .then((data) => setSplits(data.splits));
  }

  useEffect(refresh, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/splits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personName, amount: parseFloat(amount), direction, description }),
    });
    setSaving(false);
    if (res.ok) {
      setPersonName("");
      setAmount("");
      setDescription("");
      setDirection("owed_to_me");
      setFormOpen(false);
      refresh();
    }
  }

  async function toggleSettled(split: Split) {
    setSplits((prev) => prev?.map((s) => (s.id === split.id ? { ...s, settled: !s.settled } : s)) ?? prev);
    await fetch(`/api/splits/${split.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settled: !split.settled }),
    });
  }

  async function settleAllForPerson(entries: Split[]) {
    const unsettled = entries.filter((e) => !e.settled);
    setSplits((prev) => prev?.map((s) => (unsettled.some((u) => u.id === s.id) ? { ...s, settled: true } : s)) ?? prev);
    await Promise.all(
      unsettled.map((e) =>
        fetch(`/api/splits/${e.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ settled: true }),
        })
      )
    );
  }

  async function remove(split: Split) {
    setSplits((prev) => prev?.filter((s) => s.id !== split.id) ?? prev);
    await fetch(`/api/splits/${split.id}`, { method: "DELETE" });
  }

  function toggleExpanded(person: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(person)) next.delete(person);
      else next.add(person);
      return next;
    });
  }

  const groups = splits ? groupByPerson(splits) : [];
  const activeGroups = groups.filter((g) => g.entries.some((e) => !e.settled));
  const settledOnlyGroups = groups.filter((g) => g.entries.every((e) => e.settled));

  return (
    <div>
      <PageHeader title="Splits" subtitle="Who owes what — tracked manually, no Splitwise account needed" />

      <div className="px-4">
        {!formOpen ? (
          <button
            onClick={() => setFormOpen(true)}
            className="mb-5 flex w-full items-center justify-center gap-1.5 rounded-2xl py-3 text-[15px] font-medium text-white"
            style={{ background: "var(--accent)" }}
          >
            <Plus size={18} /> Add entry
          </button>
        ) : (
          <form onSubmit={handleAdd} className="mb-5 flex flex-col gap-2.5 rounded-2xl p-4" style={{ background: "var(--card)" }}>
            <input
              required
              placeholder="Person's name"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
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
              placeholder="What for? (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl px-3.5 py-2.5 text-[15px] outline-none ring-1 ring-black/5"
              style={{ background: "var(--bg)", color: "var(--text)" }}
            />

            <div className="mt-1 grid grid-cols-2 gap-2">
              <button
                type="button"
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
                type="button"
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

        {splits === null && (
          <p className="text-[15px]" style={{ color: "var(--text-secondary)" }}>
            Loading…
          </p>
        )}

        {splits && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
                People
              </h2>
              {activeGroups.length === 0 ? (
                <p className="px-1 text-[15px]" style={{ color: "var(--text-secondary)" }}>
                  All settled up 🎉
                </p>
              ) : (
                <div className="overflow-hidden rounded-2xl" style={{ background: "var(--card)" }}>
                  {activeGroups.map((g, i) => {
                    const isOpen = expanded.has(g.personName);
                    return (
                      <div key={g.personName}>
                        {i > 0 && <div className="ml-4 h-px" style={{ background: "var(--separator)" }} />}
                        <button
                          onClick={() => toggleExpanded(g.personName)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px]" style={{ color: "var(--text)" }}>
                              {g.personName}
                            </p>
                            <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                              {g.net >= 0 ? "owes you" : "you owe"}
                            </p>
                          </div>
                          <p
                            className="shrink-0 text-[15px] font-semibold tabular-nums"
                            style={{ color: g.net >= 0 ? "var(--credit)" : "var(--debit)" }}
                          >
                            {formatMoney(Math.abs(g.net))}
                          </p>
                          <ChevronDown
                            size={16}
                            style={{
                              color: "var(--text-secondary)",
                              transform: isOpen ? "rotate(180deg)" : "none",
                              transition: "transform 0.15s",
                            }}
                          />
                        </button>

                        {isOpen && (
                          <div className="pb-2" style={{ background: "var(--bg)" }}>
                            {g.entries.map((e, ei) => (
                              <div key={e.id}>
                                {ei > 0 && <div className="ml-8 h-px" style={{ background: "var(--separator)" }} />}
                                <div className="flex items-center gap-3 px-4 py-2.5 pl-8">
                                  <button
                                    onClick={() => toggleSettled(e)}
                                    className="h-4.5 w-4.5 shrink-0 rounded-full border-2"
                                    style={{
                                      borderColor: e.settled ? "var(--credit)" : "var(--text-secondary)",
                                      background: e.settled ? "var(--credit)" : "transparent",
                                    }}
                                    aria-label="Toggle settled"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p
                                      className="truncate text-[14px]"
                                      style={{ color: e.settled ? "var(--text-secondary)" : "var(--text)" }}
                                    >
                                      {e.description || (e.direction === "owed_to_me" ? "Owed to me" : "I owe")}
                                    </p>
                                    <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                                      {formatDate(e.date)}
                                    </p>
                                  </div>
                                  <p
                                    className="shrink-0 text-[14px] tabular-nums"
                                    style={{ color: e.settled ? "var(--text-secondary)" : "var(--text)" }}
                                  >
                                    {e.direction === "owed_to_me" ? "+" : "−"}
                                    {formatMoney(e.amount)}
                                  </p>
                                  <button onClick={() => remove(e)} className="shrink-0 p-1" style={{ color: "var(--text-secondary)" }}>
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                            <button
                              onClick={() => settleAllForPerson(g.entries)}
                              className="mx-8 mt-2 rounded-xl px-3 py-2 text-[13px] font-medium"
                              style={{ background: "var(--pill-bg)", color: "var(--text)" }}
                            >
                              Settle up with {g.personName}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {settledOnlyGroups.length > 0 && (
              <div>
                <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
                  Settled
                </h2>
                <div className="overflow-hidden rounded-2xl" style={{ background: "var(--card)" }}>
                  {settledOnlyGroups.map((g, i) => (
                    <div key={g.personName}>
                      {i > 0 && <div className="ml-4 h-px" style={{ background: "var(--separator)" }} />}
                      <div className="px-4 py-3 text-[15px]" style={{ color: "var(--text-secondary)" }}>
                        {g.personName} — all settled
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
