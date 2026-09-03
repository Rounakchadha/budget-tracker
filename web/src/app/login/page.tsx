"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push(searchParams.get("next") ?? "/");
      router.refresh();
    } else {
      setError("Incorrect password");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-xs">
        <h1 className="mb-1 text-center text-2xl font-semibold" style={{ color: "var(--text)" }}>
          Budget
        </h1>
        <p className="mb-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
          Enter your password to continue
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="rounded-2xl border-0 px-4 py-3.5 text-base outline-none ring-1 ring-black/5 focus:ring-2"
            style={{ background: "var(--card)", color: "var(--text)" }}
          />
          {error && <p className="px-1 text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="mt-2 rounded-2xl px-4 py-3.5 text-base font-medium text-white transition-opacity disabled:opacity-40"
            style={{ background: "var(--accent)" }}
          >
            {loading ? "Checking…" : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
