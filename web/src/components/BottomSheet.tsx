"use client";

import { useEffect, useRef, useState } from "react";

const DISMISS_THRESHOLD_PX = 80;

// Shared chrome for every bottom sheet in the app: dims + locks the
// background (no scrolling behind it), and the drag handle can be swiped
// down to dismiss. Swipe is scoped to the handle rather than the whole
// sheet so it doesn't fight with sheets that scroll internally (long
// category grids etc).
export function BottomSheet({
  onClose,
  children,
  maxHeightClassName = "max-h-[85dvh]",
}: {
  onClose: () => void;
  children: React.ReactNode;
  maxHeightClassName?: string;
}) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  function handleTouchStart(e: React.TouchEvent) {
    draggingRef.current = true;
    setIsDragging(true);
    startYRef.current = e.touches[0].clientY;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!draggingRef.current) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 0) setDragY(delta);
  }

  function handleTouchEnd() {
    draggingRef.current = false;
    setIsDragging(false);
    if (dragY > DISMISS_THRESHOLD_PX) {
      onClose();
    } else {
      setDragY(0);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className={`w-full max-w-md ${maxHeightClassName} overflow-y-auto rounded-t-3xl p-5 pb-[calc(env(safe-area-inset-bottom)+20px)]`}
        style={{
          background: "var(--card)",
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: isDragging ? "none" : "transform 0.2s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="mx-auto mb-4 h-1 w-9 rounded-full"
          style={{ background: "var(--separator)", touchAction: "none" }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
        {children}
      </div>
    </div>
  );
}
