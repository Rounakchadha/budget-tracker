export interface ParsedTransaction {
  amount: number;
  currency: string;
  direction: "debit" | "credit";
  merchantRaw: string;
  source: string;
  transactionDate: Date;
  confidence: "high" | "low";
}

export interface RawEmail {
  messageId: string;
  from: string;
  subject: string;
  bodyText: string;
}

export type Parser = (email: RawEmail) => ParsedTransaction | null;
