export interface MerchantRule {
  id: string;
  sample_raw: string;
  merchant_clean: string;
  category: string;
  created_at: string;
}

export interface Split {
  id: string;
  person_name: string;
  amount: number;
  direction: "i_owe" | "owed_to_me";
  description: string | null;
  date: string;
  settled: boolean;
  created_at: string;
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  paid: boolean;
  created_at: string;
}

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
