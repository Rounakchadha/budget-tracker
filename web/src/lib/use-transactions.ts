"use client";

import { useEffect, useState, useCallback } from "react";
import type { Transaction } from "./types";

const POLL_INTERVAL_MS = 20_000;

export function useTransactions(query: string) {
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/transactions${query}`);
    if (res.ok) {
      const data = await res.json();
      setTransactions(data.transactions);
      setError(null);
    } else {
      setError("Failed to load transactions");
    }
  }, [query]);

  useEffect(() => {
    refresh();

    // Poll while the tab/screen is visible so new transactions (ingested by
    // the background fetch job) show up without a manual reload.
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_INTERVAL_MS);

    function onVisible() {
      if (document.visibilityState === "visible") refresh();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  function updateOne(updated: Transaction) {
    setTransactions((prev) => prev?.map((t) => (t.id === updated.id ? updated : t)) ?? prev);
  }

  return { transactions, error, refresh, updateOne };
}
