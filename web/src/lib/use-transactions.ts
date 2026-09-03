"use client";

import { useEffect, useState, useCallback } from "react";
import type { Transaction } from "./types";

export function useTransactions(query: string) {
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/transactions${query}`);
    if (res.ok) {
      const data = await res.json();
      setTransactions(data.transactions);
    } else {
      setError("Failed to load transactions");
    }
  }, [query]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function updateOne(updated: Transaction) {
    setTransactions((prev) => prev?.map((t) => (t.id === updated.id ? updated : t)) ?? prev);
  }

  return { transactions, error, refresh, updateOne };
}
