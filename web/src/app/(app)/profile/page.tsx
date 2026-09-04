"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/Skeleton";
import { BalanceEditSheet } from "@/components/BalanceEditSheet";

interface Balance {
  balance: number;
  as_of: string;
}

interface GmailStatus {
  connected: boolean;
  lastSyncedAt: string | null;
  watchExpiresAt: string | null;
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
}

function formatRelative(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function ProfilePage() {
  const router = useRouter();
  const [balance, setBalance] = useState<Balance | null | undefined>(undefined);
  const [gmailStatus, setGmailStatus] = useState<GmailStatus | null>(null);
  const [editingBalance, setEditingBalance] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  function refreshBalance() {
    fetch("/api/settings/balance")
      .then((r) => r.json())
      .then((data) => setBalance(data.balance));
  }

  useEffect(() => {
    refreshBalance();
    fetch("/api/gmail/status")
      .then((r) => r.json())
      .then(setGmailStatus);
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div>
      <PageHeader title="Profile" backHref="/" />

      <div className="flex flex-col gap-6 px-4">
        <div className="flex flex-col items-center gap-2 py-2">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-semibold"
            style={{ background: "var(--card)", color: "var(--text-secondary)" }}
          >
            R
          </div>
          <p className="text-[17px] font-medium" style={{ color: "var(--text)" }}>
            Rounak
          </p>
        </div>

        <div>
          <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
            Balance
          </h2>
          {balance === undefined ? (
            <div className="flex flex-col gap-2 rounded-2xl p-4" style={{ background: "var(--card)" }}>
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-6 w-24" />
            </div>
          ) : (
            <button
              onClick={() => setEditingBalance(true)}
              className="block w-full rounded-2xl p-4 text-left active:opacity-70"
              style={{ background: "var(--card)" }}
            >
              <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                {balance ? `As of ${formatDate(balance.as_of)}` : "Not set yet — tap to set"}
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums" style={{ color: "var(--text)" }}>
                {formatMoney(balance?.balance ?? 0)}
              </p>
            </button>
          )}
        </div>

        <div>
          <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
            Instant ingestion
          </h2>
          {gmailStatus === null ? (
            <div className="flex flex-col gap-2 rounded-2xl p-4" style={{ background: "var(--card)" }}>
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3.5 w-32" />
            </div>
          ) : (
            <div className="flex flex-col gap-2 rounded-2xl p-4" style={{ background: "var(--card)" }}>
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: gmailStatus.connected ? "var(--credit)" : "var(--debit)" }}
                />
                <p className="text-[15px]" style={{ color: "var(--text)" }}>
                  {gmailStatus.connected ? "Connected" : "Not connected"}
                </p>
              </div>
              <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                {gmailStatus.lastSyncedAt
                  ? `Last synced ${formatRelative(gmailStatus.lastSyncedAt)}`
                  : "Emails are only picked up by the 5-min backup poll — Gmail push isn't set up"}
              </p>
              {gmailStatus.watchExpiresAt && (
                <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                  Push subscription renews before {formatDate(gmailStatus.watchExpiresAt)}
                </p>
              )}
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="rounded-2xl py-3.5 text-[15px] font-medium disabled:opacity-40"
          style={{ background: "var(--card)", color: "var(--debit)" }}
        >
          {loggingOut ? "Logging out…" : "Log out"}
        </button>
      </div>

      {editingBalance && (
        <BalanceEditSheet
          currentValue={balance?.balance ?? 0}
          onClose={() => setEditingBalance(false)}
          onSaved={() => {
            setEditingBalance(false);
            refreshBalance();
          }}
        />
      )}
    </div>
  );
}
