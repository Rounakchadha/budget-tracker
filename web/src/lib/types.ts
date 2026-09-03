export interface Transaction {
  id: string;
  email_message_id: string;
  amount: number;
  currency: string;
  direction: "debit" | "credit";
  merchant_raw: string;
  merchant_clean: string | null;
  category: string | null;
  source: string;
  transaction_date: string;
  parsed_confidence: "high" | "low";
  needs_review: boolean;
  raw_email_snippet: string | null;
  created_at: string;
}
