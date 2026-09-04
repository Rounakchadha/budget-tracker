"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DISMISS_THRESHOLD_PX = 80;
// Below this, a touch is treated as a tap/scroll, not a drag — avoids
// hijacking button taps or internal scrolling on tiny finger jitter.
const DRAG_START_THRESHOLD_PX = 10;
// How long the sheet takes to finish sliding off-screen once a swipe (or a
// backdrop tap) has committed to closing it, before actually unmounting.
const CLOSE_ANIMATION_MS = 280;

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
  const [isClosing, setIsClosing] = useState(false);
  const dragYRef = useRef(0);
  const startYRef = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const closeWithAnimation = useCallback(() => {
    setIsDragging(false);
    setIsClosing(true);
    setTimeout(onClose, CLOSE_ANIMATION_MS);
  }, [onClose]);

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

  // Attached as a native (non-passive) listener so touchmove can call
  // preventDefault — that's the only way to stop iOS's own elastic
  // "rubber-band" bounce from also firing while we're driving the drag
  // ourselves, which otherwise looks like the content sliding separately
  // from the box around it.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      startYRef.current = e.touches[0].clientY;
    }

    function onTouchMove(e: TouchEvent) {
      const delta = e.touches[0].clientY - startYRef.current;

      if (delta <= 0 || el!.scrollTop > 0) {
        if (dragYRef.current !== 0) {
          dragYRef.current = 0;
          setDragY(0);
        }
        setIsDragging(false);
        return;
      }

      if (delta < DRAG_START_THRESHOLD_PX) return;

      e.preventDefault();
      const next = delta - DRAG_START_THRESHOLD_PX;
      dragYRef.current = next;
      setIsDragging(true);
      setDragY(next);
    }

    function onTouchEnd() {
      if (dragYRef.current > DISMISS_THRESHOLD_PX) {
        closeWithAnimation();
      } else {
        setIsDragging(false);
        dragYRef.current = 0;
        setDragY(0);
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [closeWithAnimation]);

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40" onClick={closeWithAnimation}>
      <div
        ref={contentRef}
        className={`w-full max-w-md ${maxHeightClassName} overflow-y-auto rounded-t-3xl p-5 pb-[calc(env(safe-area-inset-bottom)+20px)]`}
        style={{
          background: "var(--card)",
          overscrollBehavior: "contain",
          transform: isClosing ? "translateY(100%)" : dragY ? `translateY(${dragY}px)` : undefined,
          transition: isClosing
            ? `transform ${CLOSE_ANIMATION_MS}ms ease-in`
            : isDragging
              ? "none"
              : "transform 0.2s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full" style={{ background: "var(--separator)" }} />
        {children}
      </div>
    </div>
  );
}
