import type { Parser } from "./types.js";
import { parseAxisEmail } from "./axis.js";

// Maps a substring found in the email's "From" header to its parser.
export const PARSERS_BY_SENDER: Array<{ senderMatch: string; parser: Parser }> = [
  { senderMatch: "alerts@axis.bank.in", parser: parseAxisEmail },
];

export function getParserForSender(from: string): Parser | null {
  const entry = PARSERS_BY_SENDER.find((p) => from.toLowerCase().includes(p.senderMatch));
  return entry?.parser ?? null;
}

export * from "./types.js";
