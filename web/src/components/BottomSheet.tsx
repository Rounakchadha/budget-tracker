"use client";

import { useEffect } from "react";

// Shared chrome for every bottom sheet in the app: dims + locks the
// background so it can't be scrolled while the sheet is open.
export function BottomSheet({
  onClose,
  children,
  maxHeightClassName = "max-h-[85dvh]",
}: {
  onClose: () => void;
  children: React.ReactNode;
  maxHeightClassName?: string;
}) {
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className={`w-full max-w-md ${maxHeightClassName} overflow-y-auto rounded-t-3xl p-5 pb-[calc(env(safe-area-inset-bottom)+20px)]`}
        style={{ background: "var(--card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full" style={{ background: "var(--separator)" }} />
        {children}
      </div>
    </div>
  );
}
