import { CLAY, DISPLAY, INK, IVORY, UI, UI_SIZE, ivory } from "../theme";
import { clamp, lerp, mixHex, prog, spring } from "../math";
import { sec } from "../time";

// Bar 0 (beats 0-4): a ball hops along the outline of "motion". Each landing
// (one per eighth note) makes that letter erupt from the baseline and launch
// the ball on; then it arcs into the second "o" and becomes the next scene.

const FONT = 520;
const S = FONT / 1000; // metrics are in 1/1000 em (Instrument Serif)
const X0 = 250;
const Y0 = 760;
const R = 46;

// Advance x and bbox centre x of each glyph, from the font file.
const GLYPHS = [
  { ch: "m", x: 0, cx: 354 },
  { ch: "o", x: 704, cx: 907 },
  { ch: "t", x: 1112, cx: 1239.5 },
  { ch: "ı", x: 1371, cx: 1484.5 },
  { ch: "o", x: 1594, cx: 1797 },
  { ch: "n", x: 2002, cx: 2239 },
];
const sx = (u: number) => X0 + u * S;
const sy = (u: number) => Y0 - u * S;

export const COUNTER = { x: sx(1797), y: sy(254) };

const WAY = [
  ...GLYPHS.map((g, i) => ({ b: i * 0.5, x: sx(g.cx), y: Y0 - R, h: 360 })),
  { b: 3, x: sx(2472 + 230), y: Y0 - R, h: 520 },
  { b: 4, x: COUNTER.x, y: COUNTER.y, h: 0 },
];
const HITS = WAY.slice(0, 7).map((w) => w.b);

function ballAt(b: number) {
  const bb = clamp(b, 0, 4);
  let i = 0;
  while (i < WAY.length - 2 && bb >= WAY[i + 1].b) i++;
  const a = WAY[i];
  const c = WAY[i + 1];
  const u = (bb - a.b) / (c.b - a.b);
  return { x: lerp(a.x, c.x, u), y: lerp(a.y, c.y, u) - a.h * 4 * u * (1 - u) };
}

/** Camera zoom about the counter of the second "o". */
export function bounceZoom(b: number) {
  return (1 + 0.02 * Math.min(b, 3.5)) * 30 ** (prog(b, 3.5, 4.3) ** 2);
}

/** Radius of the ball-iris that opens onto scene 2, in screen px. */
export const irisRadius = (b: number) => R * bounceZoom(b) * 40 ** prog(b, 4, 4.3) ** 1.5;

function Ball({ b }: { b: number }) {
  const p = ballAt(b);
  const p0 = ballAt(b - 0.01);
  const p1 = ballAt(b + 0.01);
  const vx = (p1.x - p0.x) / 0.02;
  const vy = (p1.y - p0.y) / 0.02;
  const speed = Math.hypot(vx, vy);
  const near = Math.min(...HITS.map((h) => Math.abs(b - h)));
  const contact = b < 3.6 ? Math.exp(-((near / 0.045) ** 2)) : 0;
  const stretch = 1 + clamp(speed / 5000, 0, 0.5);
  const sxs = lerp(stretch, 1.45, contact);
  const sys = lerp(1 / stretch, 0.62, contact);
  const angle = lerp((Math.atan2(vy, vx) * 180) / Math.PI, 0, contact);
  return (
    <ellipse
      cx={0}
      cy={0}
      rx={R * sxs}
      ry={R * sys}
      fill={CLAY}
      transform={`translate(${p.x} ${p.y + R * 0.38 * contact}) rotate(${angle})`}
    />
  );
}

export const Bounce: React.FC<{ b: number }> = ({ b }) => {
  const zoom = bounceZoom(b);
  const caption = "squash & stretch";
  const typed = caption.slice(0, Math.floor(clamp((b - 0.75) / 0.05, 0, caption.length)));

  // Spacing chart: where the ball was every 1/8 beat, like an animator's arc sketch.
  const spacing = [];
  for (let k = Math.max(0, Math.ceil((b - 1.6) * 8)); k / 8 <= Math.min(b, 3.9); k++) {
    const p = ballAt(k / 8);
    const age = b - k / 8;
    spacing.push(<circle key={k} cx={p.x} cy={p.y} r={5} fill={ivory(0.45 * (1 - age / 1.6))} />);
  }

  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, background: INK }}>
      <g transform={`translate(${COUNTER.x} ${COUNTER.y}) scale(${zoom}) translate(${-COUNTER.x} ${-COUNTER.y})`}>
        <line x1={X0} x2={sx(2472 + 420)} y1={Y0} y2={Y0} stroke={ivory(0.18)} strokeWidth={2} />
        {spacing}
        {GLYPHS.map((g, i) => (
          <text key={`o${i}`} x={sx(g.x)} y={Y0} fontFamily={DISPLAY} fontSize={FONT} fill="none" stroke={ivory(0.4)} strokeWidth={3}>
            {g.ch}
          </text>
        ))}
        {GLYPHS.map((g, i) => {
          if (b < i * 0.5) return null;
          const dt = sec(b - i * 0.5);
          const rise = spring(dt, 3.4, 0.38);
          const lit = 1 - prog(b - i * 0.5, 0.3, 0.8);
          const cx = sx(g.cx);
          return (
            <text
              key={i}
              x={sx(g.x)}
              y={Y0}
              fontFamily={DISPLAY}
              fontSize={FONT}
              fill={mixHex(IVORY, CLAY, lit)}
              transform={`translate(${cx} ${Y0}) scale(${1 + 0.25 * (1 - Math.min(1, rise))} ${rise}) translate(${-cx} ${-Y0})`}
            >
              {g.ch}
            </text>
          );
        })}
        <Ball b={b} />
        <text x={X0 + 8} y={Y0 + 130} fontFamily={UI} fontSize={UI_SIZE} fill={ivory(0.62)}>
          <tspan fill={CLAY}>{typed.length ? "01  " : ""}</tspan>
          {typed}
        </text>
      </g>
    </svg>
  );
};
