import { NextResponse } from "next/server";

// Vercel sets this automatically per-deployment. Used by the client to
// detect it's running a stale build (see VersionWatcher) — mainly for the
// home-screen PWA, whose WKWebView instance iOS keeps suspended and reuses
// across launches instead of always fetching fresh, unlike a normal Safari
// tab.
export async function GET() {
  return NextResponse.json({
    version: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev",
  });
}
