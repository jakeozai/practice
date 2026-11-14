"use client";

import { useEffect } from "react";

/**
 * Fades the landing page's blocks in as they scroll into view. Without
 * JavaScript, or with reduced motion, everything is simply shown.
 */
export function Reveal() {
  useEffect(() => {
    const root = document.querySelector(".lp");
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const blocks = root.querySelectorAll("[data-reveal], .lp-journey");
    // Blocks already on screen stay visible; only what is below the fold waits for its turn.
    const fold = window.innerHeight;
    blocks.forEach((el) => {
      if (el.getBoundingClientRect().top < fold * 0.9) el.classList.add("is-in");
    });
    document.documentElement.classList.add("lp-motion");
    root.classList.add("lp-js");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    blocks.forEach((el) => {
      if (!el.classList.contains("is-in")) io.observe(el);
    });
    return () => io.disconnect();
  }, []);
  return null;
}
