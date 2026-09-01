import http from "node:http";
import { URL } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { createOAuthClient, SCOPES } from "../gmail/client.js";

const PORT = 8080;

async function main() {
  const oauth2Client = createOAuthClient(`http://localhost:${PORT}`);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });

  console.log("\nOpen this URL in your browser and approve access:\n");
  console.log(authUrl);
  console.log(
    "\n(This is a Desktop-app OAuth client, so it will redirect to http://localhost after you approve.)\n"
  );

  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (!req.url) return;
      const url = new URL(req.url, "http://localhost");
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error) {
        res.end("Authorization failed. You can close this tab.");
        server.close();
        reject(new Error(`OAuth error: ${error}`));
        return;
      }

      if (code) {
        res.end("Authorization successful. You can close this tab and return to the terminal.");
        server.close();
        resolve(code);
      }
    });

    server.listen(PORT, () => {
      console.log(`Waiting for redirect on http://localhost:${PORT} ...`);
    });

    server.on("error", (err) => {
      reject(err);
    });
  });

  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    console.error(
      "\nNo refresh token returned. This usually means you've already authorized this app before.\n" +
        "Go to https://myaccount.google.com/permissions, remove 'Budget Tracker' access, and re-run this script.\n"
    );
    process.exit(1);
  }

  const envPath = path.resolve(process.cwd(), ".env");
  let envContents = fs.readFileSync(envPath, "utf-8");

  if (envContents.includes("GOOGLE_REFRESH_TOKEN=")) {
    envContents = envContents.replace(
      /GOOGLE_REFRESH_TOKEN=.*/,
      `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`
    );
  } else {
    envContents += `\nGOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`;
  }

  fs.writeFileSync(envPath, envContents);

  console.log("\nSaved refresh token to .env. You're done — future runs won't need the browser.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
