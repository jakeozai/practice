"use client";

import { useEffect, useRef } from "react";

/**
 * A day of people working, behind the whole landing page: dawn at the top,
 * night and the next dawn at the bottom. Scrolling crossfades from one photo
 * to the next in proportion to how far down you are (and back when you scroll
 * up); each photo drifts and settles as it passes, and leans a little toward
 * the pointer. The photos are pre-blurred, so the page only fades and moves them.
 */
const PHOTOS = [
  "01-dawn",
  "02-morning-cafe",
  "03-midday",
  "04-retired",
  "05-nap-time",
  "06-golden-hour",
  "07-with-dog",
  "08-after-work",
  "09-night",
  "10-late-night",
  "11-blue-hour",
];

export function ScrollBackdrop() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const layers = Array.from(el.querySelectorAll<HTMLElement>("[data-bg]"));
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let px = 0;
    let py = 0;

    const paint = () => {
      frame = 0;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const at = (Math.min(1, Math.max(0, window.scrollY / max)) * (layers.length - 1));
      layers.forEach((layer, k) => {
        const d = at - k; // -1…1 while this photo is on screen
        const opacity = Math.max(0, 1 - Math.abs(d));
        layer.style.opacity = opacity.toFixed(3);
        layer.style.visibility = opacity > 0 ? "visible" : "hidden";
        if (still || opacity === 0) return;
        const scale = 1.1 - 0.05 * (d + 1) * 0.5;
        layer.style.transform = `translate3d(${(px * 18).toFixed(1)}px, ${(py * 14 - d * 28).toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;
      });
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(paint);
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      px = e.clientX / window.innerWidth - 0.5;
      py = e.clientY / window.innerHeight - 0.5;
      schedule();
    };

    paint();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    if (!still) window.addEventListener("pointermove", onPointer, { passive: true });
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("pointermove", onPointer);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={root} className="lp-backdrop" aria-hidden="true">
      {PHOTOS.map((name, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- small pre-blurred backgrounds; no optimizer needed
        <img
          key={name}
          data-bg
          src={`/bg/${name}.jpg`}
          alt=""
          decoding="async"
          fetchPriority={i < 2 ? "high" : "low"}
          style={{ opacity: i === 0 ? 1 : 0, visibility: i === 0 ? "visible" : "hidden" }}
        />
      ))}
      <div className="lp-backdrop-shade" />
    </div>
  );
}
