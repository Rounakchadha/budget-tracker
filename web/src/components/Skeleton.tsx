export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md ${className}`} style={{ background: "var(--pill-bg)" }} />;
}

// Matches the shape of a card-list row used across Activity/Review/Bills/
// Splits: a leading circle, two lines of text, a trailing amount.
export function SkeletonRows({ rows = 4, circle = true }: { rows?: number; circle?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl" style={{ background: "var(--card)" }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i}>
          {i > 0 && <div className="ml-4 h-px" style={{ background: "var(--separator)" }} />}
          <div className="flex items-center gap-3 px-4 py-3">
            {circle && <Skeleton className="h-10 w-10 shrink-0 rounded-full" />}
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-4 w-14 shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}
