"use client";
// Horní lišta: po najetí myší plynule zpomalí (ne prudce zastaví) a po odjetí se plynule rozjede.
// Rychlost se mění přes playbackRate CSS animace, takže pozice nikdy neposkočí.
import { useEffect, useRef, type ReactNode } from "react";

const SLOW = 0.2; // rychlost při najetí myší (20 %)
const EASE_MS = 500;

export function Marquee({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef<number | undefined>(undefined);

  useEffect(() => () => cancelAnimationFrame(frame.current ?? 0), []);

  function rampTo(target: number) {
    const anim = ref.current?.getAnimations()[0];
    if (!anim) return; // animace vypnuté (prefers-reduced-motion)
    cancelAnimationFrame(frame.current ?? 0);
    const from = anim.playbackRate;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / EASE_MS);
      const eased = 1 - (1 - t) ** 3; // ease-out
      anim.updatePlaybackRate(from + (target - from) * eased);
      if (t < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  }

  return (
    <div ref={ref} className="pl-marquee pl-marquee--long pl-marquee--smooth" onPointerEnter={() => rampTo(SLOW)} onPointerLeave={() => rampTo(1)}>
      {children}
    </div>
  );
}
