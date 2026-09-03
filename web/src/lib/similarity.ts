// Free, local fuzzy matching for merchant names — no AI/API call needed.
// Handles the kind of variation UPI merchant strings actually have:
// case, punctuation, and small typos/truncations ("Prakash Munilal Kew"
// vs "PRAKASH MUNILAL KEWAT").

export function normalizeMerchant(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[a.length][b.length];
}

const SIMILARITY_THRESHOLD = 0.82;

export function isSimilarMerchant(rawA: string, rawB: string): boolean {
  const a = normalizeMerchant(rawA);
  const b = normalizeMerchant(rawB);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  const maxLen = Math.max(a.length, b.length);
  const distance = levenshtein(a, b);
  const similarity = 1 - distance / maxLen;
  return similarity >= SIMILARITY_THRESHOLD;
}
