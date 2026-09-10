export const metadata = {
  title: "Privacy Policy — Budget",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12 text-[15px] leading-relaxed" style={{ color: "#1c1c1e" }}>
      <h1 className="mb-6 text-2xl font-bold">Privacy Policy</h1>

      <p className="mb-4">
        This app (&ldquo;Budget&rdquo;) is a personal finance tracker built and used by a single individual (the developer) to
        track their own bank transactions. It is not a public product, has no other users, and is not distributed or
        offered to anyone else.
      </p>

      <h2 className="mb-2 mt-6 text-lg font-semibold">What it accesses</h2>
      <p className="mb-4">
        Budget requests read-only access to one personal Gmail inbox (the <code>gmail.readonly</code> scope) solely
        to detect bank transaction alert emails (e.g. debit/credit notifications) sent to that inbox. It does not
        read, store, or process any other email content, and does not send, delete, or modify any email.
      </p>

      <h2 className="mb-2 mt-6 text-lg font-semibold">What it stores</h2>
      <p className="mb-4">
        When a bank alert email is found, this app extracts the transaction details (amount, date, merchant name) and
        stores them in a private database controlled solely by the developer. Nothing is shared with, sold to, or
        processed by any third party beyond the infrastructure providers needed to run the app itself (hosting and
        database).
      </p>

      <h2 className="mb-2 mt-6 text-lg font-semibold">Who can access this data</h2>
      <p className="mb-4">
        Only the developer, who is also the sole user of this app. The app is protected by a private login and is not
        publicly accessible.
      </p>

      <h2 className="mb-2 mt-6 text-lg font-semibold">Contact</h2>
      <p>Questions about this policy can be sent to the developer directly.</p>
    </div>
  );
}
