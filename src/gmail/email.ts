import type { gmail_v1 } from "googleapis";
import type { RawEmail } from "../parsers/types.js";

function decodeBase64Url(data: string): string {
  return Buffer.from(data, "base64url").toString("utf-8");
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|td|table)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function findPart(
  part: gmail_v1.Schema$MessagePart | undefined,
  mimeType: string
): gmail_v1.Schema$MessagePart | null {
  if (!part) return null;
  if (part.mimeType === mimeType && part.body?.data) return part;
  for (const child of part.parts ?? []) {
    const found = findPart(child, mimeType);
    if (found) return found;
  }
  return null;
}

export function extractBodyText(payload: gmail_v1.Schema$MessagePart | undefined): string {
  const plainPart = findPart(payload, "text/plain");
  if (plainPart?.body?.data) return decodeBase64Url(plainPart.body.data);

  const htmlPart = findPart(payload, "text/html");
  if (htmlPart?.body?.data) return stripHtml(decodeBase64Url(htmlPart.body.data));

  if (payload?.body?.data) {
    const decoded = decodeBase64Url(payload.body.data);
    return payload.mimeType === "text/html" ? stripHtml(decoded) : decoded;
  }

  return "";
}

export function toRawEmail(message: gmail_v1.Schema$Message): RawEmail {
  const headers = message.payload?.headers ?? [];
  const getHeader = (name: string) => headers.find((h) => h.name === name)?.value ?? "";

  return {
    messageId: message.id!,
    from: getHeader("From"),
    subject: getHeader("Subject"),
    bodyText: extractBodyText(message.payload),
  };
}
