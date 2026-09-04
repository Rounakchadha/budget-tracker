import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  backHref,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
}) {
  return (
    <div className="px-5 pb-4 pt-[calc(env(safe-area-inset-top)+20px)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {backHref && (
            <Link
              href={backHref}
              className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full active:opacity-70"
              style={{ color: "var(--text)" }}
            >
              <ArrowLeft size={22} />
            </Link>
          )}
          <h1 className="text-[32px] font-bold tracking-tight" style={{ color: "var(--text)" }}>
            {title}
          </h1>
        </div>
        {!backHref && (
          <Link
            href="/profile"
            className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold active:opacity-70"
            style={{ background: "var(--card)", color: "var(--text-secondary)" }}
          >
            R
          </Link>
        )}
      </div>
      {subtitle && (
        <p className="mt-0.5 text-[15px]" style={{ color: "var(--text-secondary)" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
