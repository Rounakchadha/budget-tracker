import { google } from "googleapis";
import "dotenv/config";

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function createOAuthClient(redirectUri = "http://localhost") {
  return new google.auth.OAuth2(
    requireEnv("GOOGLE_CLIENT_ID"),
    requireEnv("GOOGLE_CLIENT_SECRET"),
    redirectUri
  );
}

export function getGmailClient() {
  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({
    refresh_token: requireEnv("GOOGLE_REFRESH_TOKEN"),
  });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

export { SCOPES };
