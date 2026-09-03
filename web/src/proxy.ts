import { NextResponse, type NextRequest } from "next/server";

export async function proxy(_request: NextRequest) {
  // Password gate temporarily disabled — see git history to restore.
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|apple-touch-icon.png|icon-192.png|icon-512.png).*)",
  ],
};
