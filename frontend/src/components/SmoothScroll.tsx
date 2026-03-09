"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Lenis from "lenis";

interface SmoothScrollProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wraps children in a Lenis-powered smooth-scroll container.
 * Works on an element-level scroller (not document), which is necessary
 * because the app body uses overflow-hidden.
 */
export default function SmoothScroll({ children, className }: SmoothScrollProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const lenis = new Lenis({
      wrapper: el,
      content: el.firstElementChild as HTMLElement,
      lerp: 0.12,
      smoothWheel: true,
      touchMultiplier: 1.5,
    });

    let raf: number;
    function tick(time: number) {
      lenis.raf(time);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return (
    <div ref={wrapperRef} className={className}>
      <div>{children}</div>
    </div>
  );
}
