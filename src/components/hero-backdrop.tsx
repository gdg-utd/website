"use client";

import { useEffect, useRef } from "react";

export function HeroBackdrop() {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const backdrop = backdropRef.current;
    const hero = backdrop?.parentElement;

    if (!hero || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let frame = 0;

    const update = () => {
      frame = 0;
      const distance = Math.max(0, Math.min(window.scrollY, hero.offsetHeight));

      hero.style.setProperty("--hero-shift-slow", `${distance * 0.055}px`);
      hero.style.setProperty("--hero-shift-fast", `${distance * 0.12}px`);
      hero.style.setProperty("--hero-turn", `${distance * 0.018}deg`);
      hero.style.setProperty("--hero-art-shift", `${distance * 0.035}px`);
    };

    const requestUpdate = () => {
      if (!frame) {
        frame = window.requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="hero-graphics" aria-hidden="true" ref={backdropRef}>
      <span className="hero-wash" />
      <span className="hero-grid" />
      <span className="hero-orbit" />
      <span className="accent-line accent-blue" />
      <span className="accent-line accent-red" />
      <span className="accent-line accent-yellow" />
      <span className="accent-line accent-green" />
      <span className="accent-ring ring-blue" />
      <span className="accent-ring ring-red" />
      <span className="hero-dot dot-yellow" />
      <span className="hero-dot dot-green" />
    </div>
  );
}
