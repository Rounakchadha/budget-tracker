"use client";

import { useEffect, useRef } from "react";

const CHECK_INTERVAL_MS = 60_000;

// The home-screen PWA runs in a WKWebView instance that iOS suspends and
// resumes across launches instead of always fetching fresh, unlike a normal
// Safari tab — so a Vercel redeploy can go unnoticed indefinitely. This
// polls a version stamp (the deployed commit SHA) and force-reloads once it
// changes, checked both periodically and whenever the app comes back to the
// foreground.
export function VersionWatcher() {
  const versionRef = useRef<string | null>(null);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const { version } = await res.json();

        if (versionRef.current === null) {
          versionRef.current = version;
          return;
        }
        if (version !== versionRef.current) {
          window.location.reload();
        }
      } catch {
        // Offline or a network hiccup — just try again next tick.
      }
    }

    check();

    function onVisible() {
      if (document.visibilityState === "visible") check();
    }
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") check();
    }, CHECK_INTERVAL_MS);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
    };
  }, []);

  return null;
}
