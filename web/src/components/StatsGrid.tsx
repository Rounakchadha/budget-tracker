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

export function StatsGrid() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [editingBalance, setEditingBalance] = useState(false);

  const refresh = useCallback(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  useEffect(refresh, [refresh]);

  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-3 px-4 pb-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[76px] animate-pulse rounded-2xl" style={{ background: "var(--card)" }} />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 px-4 pb-2">
        <Tile label="Total Received" value={formatMoney(stats.totalReceived)} color="var(--credit)" />
        <Tile label="Total Spent" value={formatMoney(stats.totalSpent)} color="var(--debit)" />
        <Tile
          label={stats.balanceAnchored ? "Balance" : "Net Balance (est.)"}
          value={formatMoney(stats.netBalance)}
          color={stats.netBalance >= 0 ? "var(--credit)" : "var(--debit)"}
          onClick={() => setEditingBalance(true)}
        />
        <Tile
          label={`Bills to Pay${stats.billsCount > 0 ? ` (${stats.billsCount})` : ""}`}
          value={formatMoney(stats.billsToPay)}
          color="var(--text)"
          href="/bills"
        />
      </div>

      {editingBalance && (
        <BalanceEditSheet
          currentValue={stats.netBalance}
          onClose={() => setEditingBalance(false)}
          onSaved={() => {
            setEditingBalance(false);
            refresh();
          }}
        />
      )}
    </>
  );
}
