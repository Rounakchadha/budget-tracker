import { createClient } from "@supabase/supabase-js";

// Server-only client — uses the service role key, which must never reach
// the browser. Every DB access in this app goes through Next.js route
// handlers/server components, not directly from client code.
export const supabaseServer = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
