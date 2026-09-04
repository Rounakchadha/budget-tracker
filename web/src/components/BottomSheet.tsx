"use client";

import { useEffect, useRef, useState } from "react";

const DISMISS_THRESHOLD_PX = 80;
// Below this, a touch is treated as a tap/scroll, not a drag — avoids
// hijacking button taps or internal scrolling on tiny finger jitter.
const DRAG_START_THRESHOLD_PX = 10;

// Shared chrome for every bottom sheet in the app: dims + locks the
// background (no scrolling behind it — `overflow: hidden` on body alone
// doesn't actually stop touch scrolling on iOS Safari, so the page is
// pinned with `position: fixed` instead and restored to its exact scroll
// position on close), and the whole sheet can be swiped down to dismiss.
// The swipe only engages once the sheet's own content is scrolled to the
// top and the finger is moving down, so it doesn't fight with sheets that
// scroll internally (long category grids etc).
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
    const scrollY = window.scrollY;
    const body = document.body.style;
    const prev = { position: body.position, top: body.top, width: body.width, overflow: body.overflow };

    body.position = "fixed";
    body.top = `-${scrollY}px`;
    body.width = "100%";
    body.overflow = "hidden";

    return () => {
      body.position = prev.position;
      body.top = prev.top;
      body.width = prev.width;
      body.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
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
