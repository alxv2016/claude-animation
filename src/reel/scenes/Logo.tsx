import { CLAY, DISPLAY, INK, IVORY, UI, UI_SIZE, ink } from "../theme";
import { clamp, easeOutBack, easeOutExpo, hash, prog, wobble } from "../../lib/math";
import { sec } from "../time";

// Bar 7 (beats 28-32): the drop. An ivory iris opens from the point the
// morph collapsed to, the spark draws itself ray by ray with overshoot,
// the wordmark rises out of a mask and the tagline types on the ticks.

const SPARK = { x: 600, y: 540 };
const RAYS = Array.from({ length: 12 }, (_, i) => ({
  angle: i * 30 + (hash(i, 11) - 0.5) * 14,
  length: 120 + hash(i, 12) * 60,
  delay: i * 0.035,
}));
const NAME = "Claude";
const TAGLINE = "motion designer · 60fps";

export const Logo: React.FC<{ b: number }> = ({ b }) => {
  const iris = 2300 * easeOutExpo(prog(b, 28, 28.4));
  const settle = easeOutExpo(prog(b, 28, 29.4));
  const rotation = -70 * (1 - settle) + 5 * (b - 28);
  const pulse = 1 + 0.12 * wobble(sec(b - 31), 0.16, 3) * (b >= 31 ? 1 : 0);
  const typed = TAGLINE.slice(0, Math.floor(clamp((b - 30) / (0.9 / TAGLINE.length), 0, TAGLINE.length)));

  return (
    <div style={{ position: "absolute", inset: 0, clipPath: `circle(${iris}px at 960px 540px)`, background: IVORY }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <g transform={`translate(${SPARK.x} ${SPARK.y}) rotate(${rotation})`}>
          {RAYS.map((ray, i) => {
            const grow = easeOutBack(prog(b, 28.05 + ray.delay, 28.4 + ray.delay), 2.2);
            const len = ray.length * grow * pulse;
            if (len <= 0) return null;
            const a = (ray.angle * Math.PI) / 180;
            return (
              <line key={i} x1={0} y1={0} x2={Math.cos(a) * len} y2={Math.sin(a) * len} stroke={CLAY} strokeWidth={34} strokeLinecap="round" />
            );
          })}
        </g>
      </svg>
      <div style={{ position: "absolute", left: 830, top: 380, display: "flex", height: 300, overflow: "hidden", fontFamily: DISPLAY, fontSize: 300, lineHeight: "300px", color: INK }}>
        {NAME.split("").map((ch, i) => {
          const rise = easeOutExpo(prog(b, 29 + i * 0.05, 29.5 + i * 0.05));
          return (
            <span key={i} style={{ display: "inline-block", transform: `translateY(${(1 - rise) * 105}%)` }}>
              {ch}
            </span>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 838, top: 706, fontFamily: UI, fontSize: UI_SIZE, color: ink(0.7), whiteSpace: "pre" }}>
        {typed}
        {b >= 30 && <span style={{ display: "inline-block", width: 30, height: 56, marginLeft: 6, verticalAlign: "-8px", background: CLAY, opacity: Math.floor(b * 4) % 2 ? 1 : 0 }} />}
      </div>
    </div>
  );
};
