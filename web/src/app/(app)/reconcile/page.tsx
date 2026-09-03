"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import { Upload } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import type { StatementRow } from "@/lib/statement";
import type { Transaction } from "@/lib/types";

interface ReconcileResult {
  matchedCount: number;
  missingFromApp: StatementRow[];
  extraInApp: Transaction[];
}

interface ReconcileError {
  error: string;
  detectedHeaders?: string[];
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
}

export default function ReconcilePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReconcileResult | null>(null);
  const [error, setError] = useState<ReconcileError | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setLoading(true);
    setResult(null);
    setError(null);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (parsed) => {
        const res = await fetch("/api/reconcile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: parsed.data }),
        });
        const json = await res.json();
        setLoading(false);
        if (res.ok) {
          setResult(json);
        } else {
          setError(json);
        }
      },
      error: () => {
        setLoading(false);
        setError({ error: "Couldn't read that file as CSV." });
      },
    });
  }

  return (
    <div>
      <PageHeader title="Reconcile" subtitle="Upload an Axis Bank statement (CSV) to check against Activity" />

      <div className="px-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed py-10 disabled:opacity-50"
          style={{ borderColor: "var(--separator)", color: "var(--text-secondary)" }}
        >
          <Upload size={28} />
          <span className="text-[15px]">{loading ? "Processing…" : "Choose CSV file"}</span>
        </button>

        {error && (
          <div className="mt-4 rounded-2xl p-4" style={{ background: "var(--card)" }}>
            <p className="text-[15px] font-medium" style={{ color: "var(--debit)" }}>
              {error.error}
            </p>
            {error.detectedHeaders && (
              <>
                <p className="mt-2 text-[13px]" style={{ color: "var(--text-secondary)" }}>
                  Columns found in your file:
                </p>
                <p className="mt-1 text-[13px]" style={{ color: "var(--text)" }}>
                  {error.detectedHeaders.join(", ")}
                </p>
                <p className="mt-2 text-[13px]" style={{ color: "var(--text-secondary)" }}>
                  Share these column names so the matcher can be taught this format.
                </p>
              </>
            )}
          </div>
        )}

        {result && (
          <div className="mt-4 flex flex-col gap-6">
            <div className="rounded-2xl p-4" style={{ background: "var(--card)" }}>
              <p className="text-[15px]" style={{ color: "var(--text)" }}>
                <span className="font-semibold">{result.matchedCount}</span> matched with Activity
              </p>
            </div>

            <div>
              <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
                On statement, not in app ({result.missingFromApp.length})
              </h2>
              {result.missingFromApp.length === 0 ? (
                <p className="px-1 text-[15px]" style={{ color: "var(--text-secondary)" }}>
                  None — every statement transaction was found.
                </p>
              ) : (
                <div className="overflow-hidden rounded-2xl" style={{ background: "var(--card)" }}>
                  {result.missingFromApp.map((row, i) => (
                    <div key={i}>
                      {i > 0 && <div className="ml-4 h-px" style={{ background: "var(--separator)" }} />}
                      <div className="flex items-center justify-between px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-[15px]" style={{ color: "var(--text)" }}>
                            {row.description || "—"}
                          </p>
                          <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                            {row.date}
                          </p>
                        </div>
                        <p
                          className="shrink-0 text-[15px] font-medium tabular-nums"
                          style={{ color: row.direction === "credit" ? "var(--credit)" : "var(--text)" }}
                        >
                          {row.direction === "credit" ? "+" : "−"}
                          {formatMoney(row.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
                In app, not on statement ({result.extraInApp.length})
              </h2>
              {result.extraInApp.length === 0 ? (
                <p className="px-1 text-[15px]" style={{ color: "var(--text-secondary)" }}>
                  None — every app transaction is accounted for.
                </p>
              ) : (
                <div className="overflow-hidden rounded-2xl" style={{ background: "var(--card)" }}>
                  {result.extraInApp.map((t, i) => (
                    <div key={t.id}>
                      {i > 0 && <div className="ml-4 h-px" style={{ background: "var(--separator)" }} />}
                      <div className="flex items-center justify-between px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-[15px]" style={{ color: "var(--text)" }}>
                            {t.merchant_clean ?? t.merchant_raw}
                          </p>
                          <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                            {new Date(t.transaction_date).toLocaleDateString("en-IN")}
                          </p>
                        </div>
                        <p
                          className="shrink-0 text-[15px] font-medium tabular-nums"
                          style={{ color: t.direction === "credit" ? "var(--credit)" : "var(--text)" }}
                        >
                          {t.direction === "credit" ? "+" : "−"}
                          {formatMoney(t.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
