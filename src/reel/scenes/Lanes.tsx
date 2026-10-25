import { CLAY, DISPLAY, INK, IVORY, UI, UI_SIZE, ivory } from "../theme";
import { clamp, easeInCubic, easeInOutCubic, easeOutBack, easeOutBounce, easeOutExpo, lerp, mixHex, prog, wobble } from "../math";
import { FPS, beatAt, sec, timeAtBeat } from "../time";

// Bar 5 (beats 20-24): four easings race the same distance. Each dot leaves
// a tick every 3 frames, an animator's spacing chart, so the curve is
// visible in the gaps. Then all four dots converge into the next shape.

const LANES = [
  { label: "linear", ease: (u: number) => u },
  { label: "ease-in-out", ease: easeInOutCubic },
  { label: "overshoot", ease: (u: number) => easeOutBack(u, 2.4) },
  { label: "bounce", ease: easeOutBounce },
];
const X0 = 620;
const X1 = 1780;
const laneY = (i: number) => 470 + i * 150;
const TRIP_1: [number, number] = [20.5, 22];
const TRIP_2: [number, number] = [22.2, 23.7];
const TITLE = "Feel the curve.";

function position(b: number, ease: (u: number) => number) {
  if (b < TRIP_2[0]) return ease(prog(b, ...TRIP_1));
  return 1 - ease(prog(b, ...TRIP_2));
}

export const Lanes: React.FC<{ b: number }> = ({ b }) => {
  const exit = easeInOutCubic(prog(b, 23.6, 23.95));
  const now = timeAtBeat(b);
  const step = 3 / FPS;

  return (
    <div style={{ position: "absolute", inset: 0, background: INK }}>
      <div style={{ position: "absolute", left: 96, top: 92, display: "flex", fontFamily: DISPLAY, fontSize: 170, lineHeight: "190px", height: 190, overflow: "hidden", color: IVORY }}>
        {TITLE.split("").map((ch, i) => {
          const inn = easeOutExpo(prog(b, 20.05 + i * 0.022, 20.45 + i * 0.022));
          const out = easeInCubic(prog(b, 23.45 + i * 0.012, 23.75 + i * 0.012));
          return (
            <span key={i} style={{ display: "inline-block", whiteSpace: "pre", transform: `translateY(${(1 - inn) * 100 - out * 100}%)`, color: i === TITLE.length - 1 ? CLAY : IVORY }}>
              {ch}
            </span>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 100, top: 290, fontFamily: UI, fontSize: UI_SIZE, color: ivory(0.7), transform: `translateX(${-2200 * exit}px)`, whiteSpace: "pre" }}>
        <span style={{ color: CLAY }}>06  </span>spacing chart, 1 tick = 3 frames
      </div>

      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {LANES.map((lane, i) => {
          const y = laneY(i);
          const grow = easeOutExpo(prog(b, 20.1 + i * 0.07, 20.55 + i * 0.07));
          const retract = easeInCubic(prog(b, 23.55, 23.85));
          const ticks = [];
          for (const [trip, side] of [[TRIP_1, -1], [TRIP_2, 1]] as const) {
            const t0 = timeAtBeat(trip[0]);
            const t1 = Math.min(now, timeAtBeat(trip[1]));
            for (let t = t0, k = 0; t <= t1 + 1e-6; t += step, k++) {
              const x = lerp(X0, X1, position(beatAt(t), lane.ease));
              ticks.push(<line key={`${side}${k}`} x1={x} x2={x} y1={y + side * 14} y2={y + side * 34} stroke={ivory(0.5 * (1 - exit))} strokeWidth={3} />);
            }
          }
          const p = position(b, lane.ease);
          const land = Math.max(wobble(sec(b - TRIP_1[1]), 0.1, 4), b >= TRIP_2[1] ? wobble(sec(b - TRIP_2[1]), 0.1, 4) : 0);
          const dx = lerp(lerp(X0, X1, p), 960, easeInOutCubic(prog(b, 23.72 + i * 0.03, 24)));
          const dy = lerp(y, 540, easeInOutCubic(prog(b, 23.72 + i * 0.03, 24)));
          const hero = i === 2;
          return (
            <g key={i}>
              <text x={96} y={y + 16} fontFamily={UI} fontSize={UI_SIZE} fill={hero ? CLAY : ivory(0.7)} transform={`translate(${-700 * exit} 0)`}>
                {lane.label}
              </text>
              <line
                x1={lerp(X0, X1, retract)}
                x2={lerp(X0, lerp(X0, X1, grow), 1)}
                y1={y}
                y2={y}
                stroke={ivory(0.22)}
                strokeWidth={2}
              />
              {ticks}
              {grow > 0.5 && (
                <ellipse
                  cx={dx}
                  cy={dy}
                  rx={26 * (1 + 0.25 * clamp(land)) * lerp(1, 1.6, exit)}
                  ry={26 * (1 - 0.2 * clamp(land)) * lerp(1, 1.6, exit)}
                  fill={hero ? CLAY : mixHex(IVORY, CLAY, exit)}
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
