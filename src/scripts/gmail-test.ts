import { getGmailClient } from "../gmail/client.js";

async function main() {
  const gmail = getGmailClient();

  const profile = await gmail.users.getProfile({ userId: "me" });
  console.log(`Authenticated as: ${profile.data.emailAddress}\n`);

  const query = process.argv[2] ?? "from:axisbank.com";
  const res = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: 5,
  });

  const messages = res.data.messages ?? [];
  console.log(`Query: "${query}" — found ${res.data.resultSizeEstimate ?? 0} matching messages (showing up to 5)\n`);

  for (const msg of messages) {
    const full = await gmail.users.messages.get({
      userId: "me",
      id: msg.id!,
      format: "metadata",
      metadataHeaders: ["From", "Subject", "Date"],
    });
    const headers = full.data.payload?.headers ?? [];
    const get = (name: string) => headers.find((h) => h.name === name)?.value;
    console.log(`- [${get("Date")}] From: ${get("From")} | Subject: ${get("Subject")}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
