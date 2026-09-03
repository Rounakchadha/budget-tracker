import { BottomNav } from "@/components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh" style={{ background: "var(--bg)" }}>
      <div className="pb-24">{children}</div>
      <BottomNav />
    </div>
  );
}
