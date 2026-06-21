import { useEffect, useRef, useState, ReactNode } from "react";

// ── Анимация числа (count-up) ────────────────────────────────────────
export function useCountUp(target: number, duration = 900) {
  const [val, setVal] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef<number>();
  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const cur = from + (target - from) * eased;
      setVal(cur);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); fromRef.current = target; };
  }, [target, duration]);
  return val;
}

// ── 3D tilt-обёртка (наклон по касанию + гироскоп) ──────────────────
export function Tilt3D({ children, className = "", max = 10, glare = true }: {
  children: ReactNode; className?: string; max?: number; glare?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [glarePos, setGlarePos] = useState({ x: 50, y: 0, o: 0 });

  const apply = (px: number, py: number) => {
    // px, py в диапазоне -0.5..0.5
    const ry = px * max * 2;
    const rx = -py * max * 2;
    setStyle({ transform: `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)` });
    setGlarePos({ x: 50 + px * 100, y: 50 + py * 100, o: 0.25 });
  };
  const reset = () => {
    setStyle({ transform: "perspective(900px) rotateX(0) rotateY(0) scale(1)" });
    setGlarePos(g => ({ ...g, o: 0 }));
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    apply((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
  };

  // гироскоп на телефоне
  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      const px = Math.max(-0.5, Math.min(0.5, e.gamma / 45));
      const py = Math.max(-0.5, Math.min(0.5, (e.beta - 45) / 45));
      apply(px * 0.6, py * 0.6);
    };
    window.addEventListener("deviceorientation", handler);
    return () => window.removeEventListener("deviceorientation", handler);
  }, []);

  return (
    <div
      ref={ref}
      className={`card-3d relative ${className}`}
      style={style}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      onPointerCancel={reset}
    >
      {children}
      {glare && (
        <div className="absolute inset-0 rounded-[inherit] pointer-events-none overflow-hidden" style={{ borderRadius: "inherit" }}>
          <div style={{
            position: "absolute", inset: 0,
            background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,${glarePos.o}), transparent 55%)`,
            transition: "opacity 0.3s",
          }} />
        </div>
      )}
    </div>
  );
}
