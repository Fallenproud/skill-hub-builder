import { useEffect, useRef } from "react";
import { gsap } from "gsap";

/**
 * Subtle GSAP-powered tilt + glow follow for cards.
 * Respects prefers-reduced-motion.
 */
export function useTilt<T extends HTMLElement = HTMLDivElement>(opts?: {
  max?: number;        // max tilt in degrees
  scale?: number;      // hover scale
  glow?: boolean;      // show pointer-following glow
}) {
  const ref = useRef<T | null>(null);
  const max = opts?.max ?? 6;
  const scale = opts?.scale ?? 1.01;
  const glow = opts?.glow ?? true;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const quickX = gsap.quickTo(el, "rotationY", { duration: 0.5, ease: "power2.out" });
    const quickY = gsap.quickTo(el, "rotationX", { duration: 0.5, ease: "power2.out" });
    const quickS = gsap.quickTo(el, "scale",     { duration: 0.5, ease: "power2.out" });

    gsap.set(el, { transformPerspective: 800, transformOrigin: "center" });

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      quickX((px - 0.5) * 2 * max);
      quickY((0.5 - py) * 2 * max);
      if (glow) {
        el.style.setProperty("--glow-x", `${px * 100}%`);
        el.style.setProperty("--glow-y", `${py * 100}%`);
      }
    };
    const onEnter = () => quickS(scale);
    const onLeave = () => {
      quickX(0); quickY(0); quickS(1);
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [max, scale, glow]);

  return ref;
}
