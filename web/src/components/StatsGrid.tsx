"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BalanceEditSheet } from "./BalanceEditSheet";

interface Stats {
  totalReceived: number;
  totalSpent: number;
  netBalance: number;
  balanceAnchored: boolean;
  balanceAsOf: string | null;
  billsToPay: number;
  billsCount: number;
  splitsNet: number;
  splitsCount: number;
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function Tile({
  label,
  value,
  color,
  href,
  onClick,
}: {
  label: string;
  value: string;
  color: string;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <div className="rounded-2xl p-4" style={{ background: "var(--card)" }}>
      <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums" style={{ color }}>
        {value}
      </p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block active:opacity-70">
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button onClick={onClick} className="block w-full text-left active:opacity-70">
        {content}
      </button>
    );
  }

  return content;
}

type Period = "month" | "all";

export function StatsGrid() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [editingBalance, setEditingBalance] = useState(false);
  const [period, setPeriod] = useState<Period>("month");

  const refresh = useCallback((p: Period) => {
    fetch(`/api/stats?period=${p}`)
      .then((r) => r.json())
      .then(setStats);
  }, []);

  useEffect(() => {
    setStats(null);
    refresh(period);
  }, [refresh, period]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") refresh(period);
    }, 20_000);
    return () => clearInterval(interval);
  }, [refresh, period]);

  if (!stats) {
    return (
      <div className="px-4 pb-2">
        <div className="mb-3 h-[92px] animate-pulse rounded-2xl" style={{ background: "var(--card)" }} />
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[76px] animate-pulse rounded-2xl" style={{ background: "var(--card)" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 pb-2">
        <div className="mb-2 flex items-center justify-between">
          <p className="ml-3 text-[15px] font-medium" style={{ color: "var(--text)" }}>
            Hi Rounak
          </p>
          <button
            onClick={() => setPeriod((p) => (p === "month" ? "all" : "month"))}
            className="rounded-full px-3 py-1 text-[12px] font-medium active:opacity-70"
            style={{ background: "var(--card)", color: "var(--text-secondary)" }}
          >
            {period === "month" ? "This Month" : "All Time"}
          </button>
        </div>

        <button
          onClick={() => setEditingBalance(true)}
          className="mb-4 block w-full rounded-2xl p-5 text-center active:opacity-70"
          style={{ background: "var(--card)" }}
        >
          <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
            {stats.balanceAnchored ? "Balance" : "Net Balance (est.)"}
          </p>
          <p
            className="mt-1 text-4xl font-semibold tabular-nums"
            style={{ color: stats.netBalance >= 0 ? "var(--credit)" : "var(--debit)" }}
          >
            {formatMoney(stats.netBalance)}
          </p>
        </button>

        <div className="grid grid-cols-2 gap-3">
          <Tile label="Total Received" value={formatMoney(stats.totalReceived)} color="var(--credit)" />
          <Tile label="Total Spent" value={formatMoney(stats.totalSpent)} color="var(--debit)" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Tile
            label={`Bills to Pay${stats.billsCount > 0 ? ` (${stats.billsCount})` : ""}`}
            value={formatMoney(stats.billsToPay)}
            color="var(--text)"
            href="/bills"
          />
          <Tile
            label={stats.splitsNet >= 0 ? "You're Owed" : "You Owe"}
            value={formatMoney(Math.abs(stats.splitsNet))}
            color={stats.splitsNet >= 0 ? "var(--credit)" : "var(--debit)"}
            href="/splits"
          />
        </div>
      </div>

      {editingBalance && (
        <BalanceEditSheet
          currentValue={stats.netBalance}
          onClose={() => setEditingBalance(false)}
          onSaved={() => {
            setEditingBalance(false);
            refresh(period);
          }}
        />
      )}
    </>
  );
}
