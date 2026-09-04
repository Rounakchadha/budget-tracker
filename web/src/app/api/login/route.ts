import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE_NAME, timingSafeEqualStr } from "@/lib/session";

export async function POST(request: Request) {
  const { password } = await request.json();

  if (typeof password !== "string" || !timingSafeEqualStr(password, process.env.APP_PASSWORD!)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const token = await createSessionToken(process.env.SESSION_SECRET!);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
