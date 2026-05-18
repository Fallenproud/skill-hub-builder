import { useEffect, useRef } from "react";
import { gsap } from "gsap";

/**
 * Slow drifting gradient mesh painted behind the app.
 * Pointer-events: none. Respects prefers-reduced-motion.
 */
export default function AmbientMesh() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const tl = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: "sine.inOut" } });
    tl.to(el, { backgroundPosition: "60% 40%, 30% 80%, 90% 10%", duration: 18 })
      .to(el, { backgroundPosition: "20% 70%, 80% 20%, 40% 90%", duration: 18 });
    return () => { tl.kill(); };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 opacity-90"
      style={{
        backgroundImage: "var(--gradient-mesh)",
        backgroundSize: "140% 140%, 140% 140%, 140% 140%",
        backgroundPosition: "20% 10%, 80% 0%, 0% 90%",
        backgroundRepeat: "no-repeat",
        transition: "background-position 1.2s var(--ease-soft)",
      }}
    />
  );
}
