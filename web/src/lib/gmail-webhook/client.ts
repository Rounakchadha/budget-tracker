import { google } from "googleapis";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

// Same OAuth client/refresh token as the root ingestion project
// (src/gmail/client.ts) — one Google account, two consumers.
export function getGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    requireEnv("GOOGLE_CLIENT_ID"),
    requireEnv("GOOGLE_CLIENT_SECRET"),
    "http://localhost"
  );
  oauth2Client.setCredentials({ refresh_token: requireEnv("GOOGLE_REFRESH_TOKEN") });
  return google.gmail({ version: "v1", auth: oauth2Client });
}
