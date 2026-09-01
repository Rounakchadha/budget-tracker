import { supabase } from "../db/client.js";

async function main() {
  const { error: txError, count: txCount } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true });

  const { error: unparsedError, count: unparsedCount } = await supabase
    .from("unparsed_emails")
    .select("*", { count: "exact", head: true });

  if (txError || unparsedError) {
    console.error("Schema check failed:", txError ?? unparsedError);
    process.exit(1);
  }

  console.log(`Connected. transactions rows: ${txCount}, unparsed_emails rows: ${unparsedCount}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
