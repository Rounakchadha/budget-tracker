import { supabaseServer } from "./supabase-server";
import { isSimilarMerchant } from "./similarity";
import type { MerchantRule, Transaction } from "./types";

// Applies saved merchant rules to any transaction the user hasn't touched
// yet (merchant_clean still null). Matches get pre-filled with the rule's
// name/category but stay needs_review=true — a one-time confirmation tap,
// not a silent auto-apply, since fuzzy matching can occasionally be wrong.
export async function applyPendingMerchantRules(): Promise<number> {
  const [{ data: rules, error: rulesError }, { data: candidates, error: txError }] = await Promise.all([
    supabaseServer.from("merchant_rules").select("*"),
    supabaseServer.from("transactions").select("id, merchant_raw").is("merchant_clean", null),
  ]);

  if (rulesError) throw new Error(rulesError.message);
  if (txError) throw new Error(txError.message);
  if (!rules || rules.length === 0 || !candidates || candidates.length === 0) return 0;

  let updatedCount = 0;

  for (const candidate of candidates as Pick<Transaction, "id" | "merchant_raw">[]) {
    const matchingRule = (rules as MerchantRule[]).find((rule) => isSimilarMerchant(rule.sample_raw, candidate.merchant_raw));
    if (!matchingRule) continue;

    const { error } = await supabaseServer
      .from("transactions")
      .update({
        merchant_clean: matchingRule.merchant_clean,
        category: matchingRule.category,
        needs_review: true,
      })
      .eq("id", candidate.id);

    if (!error) updatedCount++;
  }

  return updatedCount;
}
