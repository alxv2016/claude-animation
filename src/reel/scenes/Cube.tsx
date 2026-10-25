import { CLAY, DISPLAY, INK, IVORY, UI, UI_SIZE, ink, ivory } from "../theme";
import { clamp, easeInExpo, easeOutExpo, lerp, prog, spring } from "../../lib/math";
import { sec } from "../time";

// Bar 4 (beats 16-20): a cube that turns on every beat with real
// anticipation and overshoot, the principle written on each face.
// It ends face-on and the camera dollies into the front face.

const SIZE = 440;
const CENTER = { x: 1310, y: 520 };
const FACES = [
  { word: "hold", t: "rotateY(0deg)" },
  { word: "overshoot", t: "rotateY(90deg)" },
  { word: "settle", t: "rotateY(180deg)" },
  { word: "anticipate", t: "rotateY(-90deg)" },
];
const WORDS = ["weight.", "depth.", "spring.", "settle."];
const RING = "anticipation · overshoot · settle · hold · ";

/** One beat-locked quarter turn: a small wind-up before the beat, a springy overshoot after. */
function turn(b: number, k: number) {
  const before = prog(b, k - 0.22, k);
  if (b < k) return -0.07 * Math.sin(Math.PI * before);
  return spring(sec(b - k), 2.1, 0.36);
}

function RollingWord({ b }: { b: number }) {
  const idx = clamp(Math.floor(b - 16), 0, 3);
  const enter = (letter: number) => easeOutExpo(prog(b, 16 + idx + letter * 0.025, 16 + idx + letter * 0.025 + 0.4));
  const word = WORDS[idx];
  return (
    <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 230, lineHeight: "250px", color: INK, height: 250, overflow: "hidden" }}>
      {word.split("").map((ch, i) => (
        <span
          key={`${idx}-${i}`}
          style={{
            display: "inline-block",
            transform: `translateY(${(1 - enter(i)) * 100}%)`,
            color: i === word.length - 1 ? CLAY : INK,
          }}
        >
          {ch}
        </span>
      ))}
    </div>
  );
}

export const Cube: React.FC<{ b: number }> = ({ b }) => {
  const dolly = easeInExpo(prog(b, 19.5, 20));
  const pop = 0.72 + 0.28 * spring(sec(b - 16), 2, 0.42);
  const turns = [16, 17, 18, 19].reduce((s, k) => s + turn(b, k), 0);
  const ry = -32 + 90 * turns + 32 * dolly;
  const rx = lerp(-22 + 4 * Math.sin(b * 0.9), 0, dolly);
  const hop = [16, 17, 18, 19].reduce((s, k) => s + Math.sin(Math.PI * prog(b, k - 0.1, k + 0.35)), 0);
  const zoom = lerp(1, 9, dolly) * pop;
  const cx = lerp(CENTER.x, 960, dolly);
  const cy = lerp(CENTER.y, 540, dolly);
  const textOut = easeInExpo(prog(b, 19.45, 19.85));
  const caption = "depth & weight";
  const typed = caption.slice(0, Math.floor(clamp((b - 16.15) / 0.05, 0, caption.length)));

  return (
    <div style={{ position: "absolute", inset: 0, background: IVORY, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 110, top: 300, transform: `translateX(${-900 * textOut}px)` }}>
        <div style={{ fontFamily: UI, fontSize: UI_SIZE, color: ink(0.65), marginBottom: 24, whiteSpace: "pre" }}>
          <span style={{ color: CLAY }}>05  </span>
          {typed}
        </div>
        <RollingWord b={b} />
      </div>

      <div
        style={{
          position: "absolute",
          left: CENTER.x - 300,
          top: CENTER.y + 330,
          width: 600,
          height: 70,
          borderRadius: "50%",
          background: ink(0.1),
          transform: `scale(${(1 - 0.25 * hop) * pop})`,
          opacity: 1 - dolly,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: cx,
          top: cy - 40 * hop * (1 - dolly),
          width: 0,
          height: 0,
          perspective: 1900,
          transform: `scale(${zoom})`,
        }}
      >
        <div style={{ position: "absolute", transformStyle: "preserve-3d", transform: `rotateX(${rx}deg) rotateY(${ry}deg)` }}>
          {FACES.map((f, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: -SIZE / 2,
                top: -SIZE / 2,
                width: SIZE,
                height: SIZE,
                background: INK,
                backfaceVisibility: "hidden",
                transform: `${f.t} translateZ(${SIZE / 2}px)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: DISPLAY,
                fontSize: f.word.length > 7 ? 92 : 120,
                color: ivory(1 - prog(b, 19.5, 19.68)),
                boxShadow: `inset 0 0 0 3px ${ivory(0.12)}`,
              }}
            >
              {f.word}
            </div>
          ))}
          <div
            style={{
              position: "absolute",
              left: -SIZE / 2,
              top: -SIZE / 2,
              width: SIZE,
              height: SIZE,
              background: CLAY,
              transform: `rotateX(90deg) translateZ(${SIZE / 2}px)`,
            }}
          />
          {RING.repeat(2)
            .split("")
            .map((ch, i, all) => {
              const a = (i / all.length) * 360 + b * 38;
              const facing = Math.cos(((a + ry) * Math.PI) / 180);
              return (
                <div
                  key={`r${i}`}
                  style={{
                    position: "absolute",
                    left: -16,
                    top: -28,
                    width: 32,
                    textAlign: "center",
                    fontFamily: UI,
                    fontSize: 40,
                    color: facing > 0 ? INK : ink(0.28),
                    transform: `rotateY(${a}deg) translateZ(${SIZE * 0.95}px) translateY(${SIZE * 0.62}px)`,
                    opacity: 1 - dolly,
                  }}
                >
                  {ch}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};
