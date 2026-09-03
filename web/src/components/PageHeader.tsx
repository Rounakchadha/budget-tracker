export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-5 pb-4 pt-[calc(env(safe-area-inset-top)+20px)]">
      <h1 className="text-[32px] font-bold tracking-tight" style={{ color: "var(--text)" }}>
        {title}
      </h1>
      {subtitle && (
        <p className="mt-0.5 text-[15px]" style={{ color: "var(--text-secondary)" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
