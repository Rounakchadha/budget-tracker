"use client";

import { useEffect, useRef, useState } from "react";

const DISMISS_THRESHOLD_PX = 80;
// Below this, a touch is treated as a tap/scroll, not a drag — avoids
// hijacking button taps or internal scrolling on tiny finger jitter.
const DRAG_START_THRESHOLD_PX = 10;

// Shared chrome for every bottom sheet in the app: dims + locks the
// background (no scrolling behind it), and the sheet can be swiped down
// anywhere to dismiss. Only engages when the sheet's own scroll is already
// at the top and the finger is moving down — otherwise a normal scroll
// inside a tall sheet (long category grid etc) just scrolls as usual.
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
  const startYRef = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  function handleTouchStart(e: React.TouchEvent) {
    startYRef.current = e.touches[0].clientY;
  }

  function handleTouchMove(e: React.TouchEvent) {
    const container = contentRef.current;
    if (!container) return;

    const delta = e.touches[0].clientY - startYRef.current;

    if (delta <= 0 || container.scrollTop > 0) {
      // Moving up, or there's still content above to scroll to — let the
      // sheet's own scroll handle it instead of dragging.
      if (dragY !== 0) setDragY(0);
      if (isDragging) setIsDragging(false);
      return;
    }

    if (delta < DRAG_START_THRESHOLD_PX) return;

    setIsDragging(true);
    setDragY(delta - DRAG_START_THRESHOLD_PX);
  }

  function handleTouchEnd() {
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
        ref={contentRef}
        className={`w-full max-w-md ${maxHeightClassName} overflow-y-auto rounded-t-3xl p-5 pb-[calc(env(safe-area-inset-bottom)+20px)]`}
        style={{
          background: "var(--card)",
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: isDragging ? "none" : "transform 0.2s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full" style={{ background: "var(--separator)" }} />
        {children}
      </div>
    </div>
  );
}
