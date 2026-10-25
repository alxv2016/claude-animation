import { CLAY, DISPLAY, INK, UI, UI_SIZE, ivory } from "../theme";
import { easeInBack, easeOutBack, easeOutExpo, lerp, noise1, prog, wobble } from "../math";
import { sec } from "../time";

// Bar 6 (beats 24-28): the build. One clay shape morphs on every eighth,
// then every sixteenth, the camera tightens and shakes, and on the last
// half-beat (silence in the score) it winds down to a point: anticipation.

const N = 180;
type Radial = (theta: number) => number;

function polygon(verts: [number, number][]): Radial {
  return (theta) => {
    const dx = Math.cos(theta);
    const dy = Math.sin(theta);
    let best = Infinity;
    for (let i = 0; i < verts.length; i++) {
      const [ax, ay] = verts[i];
      const [bx, by] = verts[(i + 1) % verts.length];
      const ex = bx - ax, ey = by - ay;
      const den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-9) continue;
      const t = (ax * ey - ay * ex) / den;
      const s = (ax * dy - ay * dx) / den;
      if (t > 0 && s >= -1e-9 && s <= 1 + 1e-9) best = Math.min(best, t);
    }
    return best;
  };
}
const star = (points: number, inner: number, rot = -Math.PI / 2) =>
  polygon(Array.from({ length: points * 2 }, (_, i) => {
    const a = rot + (i * Math.PI) / points;
    const r = i % 2 ? inner : 1;
    return [Math.cos(a) * r, Math.sin(a) * r] as [number, number];
  }));
const regular = (sides: number, rot = -Math.PI / 2) => star(sides, Math.cos(Math.PI / sides), rot);
const plus = polygon([
  [0.33, -1], [0.33, -0.33], [1, -0.33], [1, 0.33], [0.33, 0.33], [0.33, 1],
  [-0.33, 1], [-0.33, 0.33], [-1, 0.33], [-1, -0.33], [-0.33, -0.33], [-0.33, -1],
]);

const SHAPES: Radial[] = [
  () => 1,
  (t) => 0.86 * (Math.abs(Math.cos(t)) ** 8 + Math.abs(Math.sin(t)) ** 8) ** (-1 / 8),
  (t) => regular(3)(t) * 1.15,
  plus,
  star(5, 0.48),
  regular(6),
  star(4, 0.32, 0),
  (t) => 0.92 + 0.12 * Math.sin(3 * t) + 0.06 * Math.sin(5 * t + 1),
  star(8, 0.62),
  () => 1,
];
const KEYS = [24, 24.5, 25, 25.5, 26, 26.5, 26.75, 27, 27.25];
const WORDS = [
  { text: "build", x: 110, top: 110 },
  { text: "tension", x: 930, top: 700 },
  { text: "then", x: 150, top: 690 },
  { text: "release", x: 960, top: 100 },
];

function shapePath(b: number) {
  let k = 0;
  while (k < KEYS.length - 1 && b >= KEYS[k + 1]) k++;
  const gap = (KEYS[k + 1] ?? 27.5) - KEYS[k];
  const u = easeOutBack(prog(b, KEYS[k], KEYS[k] + Math.min(0.22, gap * 0.8)), 1.4);
  const from = SHAPES[k];
  const to = SHAPES[k + 1];
  const pts = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const r = lerp(from(t), to(t), u);
    pts.push(`${(Math.cos(t) * r).toFixed(4)},${(Math.sin(t) * r).toFixed(4)}`);
  }
  const lastKey = KEYS.filter((key) => b >= key).at(-1) ?? 24;
  return { d: `M${pts.join("L")}Z`, k, pulse: wobble(sec(b - lastKey), 0.09, 3.5) };
}

export const Morph: React.FC<{ b: number }> = ({ b }) => {
  const { d, k, pulse } = shapePath(b);
  const spin = KEYS.reduce((s, key) => s + 45 * easeOutExpo(prog(b, key, key + 0.3)), 0);
  const windDown = easeInBack(prog(b, 27.5, 27.98), 2.2);
  const radius = 270 * (1 + 0.1 * pulse) * (1 - windDown * 0.985);
  const shake = 14 * prog(b, 25.5, 27.5) ** 2;
  const camX = noise1(b * 14, 1) * shake;
  const camY = noise1(b * 14, 2) * shake;
  const zoom = lerp(1, 1.12, prog(b, 24, 27.5));
  const wordIdx = Math.floor(b - 24);
  const word = b < 27.5 ? WORDS[Math.max(0, Math.min(3, wordIdx))] : null;
  const slam = easeOutExpo(prog(b, 24 + Math.max(0, wordIdx), 24.2 + Math.max(0, wordIdx)));
  const ring = 380 * (1 + 0.06 * pulse) * (1 - windDown);

  return (
    <div style={{ position: "absolute", inset: 0, background: INK, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, transform: `translate(${camX}px, ${camY}px) scale(${zoom})` }}>
        {word && (
          <div
            style={{
              position: "absolute",
              left: word.x,
              top: word.top,
              fontFamily: DISPLAY,
              fontStyle: "italic",
              fontSize: 300,
              lineHeight: "300px",
              color: ivory(0.9),
              transform: `scale(${lerp(1.35, 1, slam)})`,
              transformOrigin: "left bottom",
            }}
          >
            {word.text}
          </div>
        )}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          <circle
            cx={960}
            cy={540}
            r={Math.max(0, ring)}
            fill="none"
            stroke={ivory(0.3)}
            strokeWidth={3}
            strokeDasharray="3 16"
            transform={`rotate(${-b * 50} 960 540)`}
          />
          <path d={d} fill={CLAY} transform={`translate(960 540) rotate(${spin}) scale(${radius})`} />
        </svg>
        <div style={{ position: "absolute", left: 110, top: 505, fontFamily: UI, fontSize: UI_SIZE, color: ivory(0.7), opacity: b < 27.5 ? 1 : 0, whiteSpace: "pre" }}>
          <span style={{ color: CLAY }}>07  </span>shape {String(k + 1).padStart(2, "0")}/09
        </div>
      </div>
    </div>
  );
};
