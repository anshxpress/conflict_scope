"use client";

import type { ReactNode } from "react";

interface SmoothScrollProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wraps children in a Lenis-powered smooth-scroll container.
 * Works on an element-level scroller (not document), which is necessary
 * because the app body uses overflow-hidden.
 */
export default function SmoothScroll({
  children,
  className,
}: SmoothScrollProps) {
  return (
    <div
      className={className}
      style={{
        WebkitOverflowScrolling: "touch",
        overscrollBehavior: "contain",
        touchAction: "pan-y",
      }}
    >
      <div>{children}</div>
    </div>
  );
}
