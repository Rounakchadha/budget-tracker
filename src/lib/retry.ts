// Small retry helper for transient network failures (e.g. ECONNRESET) that
// can otherwise kill an unattended scheduled run partway through a batch.
export async function withRetry<T>(fn: () => PromiseLike<T>, attempts = 3, delayMs = 1000): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * (i + 1)));
      }
    }
  }
  throw lastErr;
}
