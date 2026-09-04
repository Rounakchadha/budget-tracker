import { BottomNav } from "@/components/BottomNav";
import { VersionWatcher } from "@/components/VersionWatcher";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh" style={{ background: "var(--bg)" }}>
      <VersionWatcher />
      <div className="pb-24">{children}</div>
      <BottomNav />
    </div>
  );
}
