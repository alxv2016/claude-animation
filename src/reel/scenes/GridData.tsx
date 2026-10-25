import { CLAY, DISPLAY, INK, IVORY, UI, UI_SIZE, ivory } from "../theme";
import { clamp, easeInBack, easeInOutCubic, easeOutBack, easeOutExpo, hash, lerp, mixHex, prog, spring } from "../math";
import { sec } from "../time";

// Bar 2 (beats 8-12): a 16x9 field of dashes, one rule. Each beat a ripple
// leaves a new source cell and every dash turns 90° as the wave passes.
// Bar 3 (beats 12-16): the field collapses into a bar chart that updates on
// every beat, a line draws across it, and the counter shows this very render.

const COLS = 16;
const ROWS = 9;
const CELL = 120;
const SOURCES = [
  { k: 8, c: 3, r: 2 },
  { k: 9, c: 12, r: 6 },
  { k: 10, c: 7, r: 4 },
  { k: 11, c: 14, r: 1 },
];
const DATA = [
  [1, 1, 2, 1, 2, 2, 3, 2, 3, 3, 4, 5, 4, 5, 6, 6],
  [2, 1, 1, 2, 2, 3, 2, 3, 3, 4, 5, 4, 6, 5, 6, 7],
  [1, 2, 2, 2, 3, 2, 3, 3, 4, 4, 4, 6, 5, 6, 7, 7],
  [2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 6, 6, 7, 7, 7, 8],
];

function Cells({ b }: { b: number }) {
  const out = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let ripple = 0;
      let turns = 0;
      for (const s of SOURCES) {
        const d = Math.hypot(c - s.c, r - s.r);
        const age = b - s.k;
        if (age >= 0) ripple += Math.exp(-(((d - age * 11) / 1.9) ** 2)) * Math.exp(-age / 1.1);
        turns += easeOutBack(prog(b, s.k + d * 0.035, s.k + d * 0.035 + 0.38), 2.2);
      }
      ripple = clamp(ripple);
      const bar = r >= ROWS - DATA[0][c];
      const appear = easeOutBack(prog(b, 7.45 + (c + r) * 0.012, 7.8 + (c + r) * 0.012));
      const collapse = easeInOutCubic(prog(b, 11.25 + (ROWS - 1 - r) * 0.03 + c * 0.012, 11.8 + (ROWS - 1 - r) * 0.03 + c * 0.012));
      const vanish = bar ? 0 : easeInBack(prog(b, 11.1 + (r * 0.05 + hash(c * 31 + r, 3) * 0.15), 11.45 + (r * 0.05 + hash(c * 31 + r, 3) * 0.15)));

      let w = lerp(70, 90, ripple);
      let h = lerp(22, 90, ripple);
      let radius = lerp(9, 42, ripple);
      let color = mixHex("#8a877f", CLAY, ripple * 1.6);
      let rot = turns * 90;
      if (bar) {
        w = lerp(w, CELL - 8, collapse);
        h = lerp(h, CELL + 0.5, collapse);
        radius = lerp(radius, 0, collapse);
        color = mixHex("#8a877f", CLAY, Math.max(ripple * 1.6, collapse));
        rot = lerp(rot, Math.round(rot / 180) * 180, collapse);
      }
      const scale = appear * (1 - vanish);
      if (scale <= 0.001) continue;
      out.push(
        <div
          key={`${c}-${r}`}
          style={{
            position: "absolute",
            left: c * CELL + CELL / 2 - w / 2,
            top: r * CELL + CELL / 2 - h / 2,
            width: w,
            height: h,
            borderRadius: radius,
            background: color,
            transform: `rotate(${rot}deg) scale(${scale})`,
          }}
        />,
      );
    }
  }
  return <>{out}</>;
}

function barHeight(c: number, b: number) {
  let cells = DATA[0][c];
  for (let k = 1; k < DATA.length; k++) {
    cells += (DATA[k][c] - DATA[k - 1][c]) * spring(sec(b - (12 + k) - c * 0.025), 2.6, 0.5);
  }
  return cells * CELL;
}

function Chart({ b }: { b: number }) {
  const tops = Array.from({ length: COLS }, (_, c) => ({ x: c * CELL + CELL / 2, y: 1080 - barHeight(c, b) }));
  const segs = tops.slice(1).map((p, i) => Math.hypot(p.x - tops[i].x, p.y - tops[i].y));
  const total = segs.reduce((s, v) => s + v, 0);
  const drawn = easeInOutCubic(prog(b, 14, 14.8)) * total;
  let tip = tops[0];
  let acc = 0;
  for (let i = 0; i < segs.length; i++) {
    if (acc + segs[i] >= drawn) {
      const u = (drawn - acc) / segs[i];
      tip = { x: lerp(tops[i].x, tops[i + 1].x, u), y: lerp(tops[i].y, tops[i + 1].y, u) };
      break;
    }
    acc += segs[i];
    tip = tops[i + 1];
  }
  return (
    <>
      {tops.map((p, c) => (
        <div key={c} style={{ position: "absolute", left: c * CELL + 4, top: p.y, width: CELL - 8, height: 1080 - p.y, background: CLAY }} />
      ))}
      {b >= 14 && (
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          <polyline
            points={tops.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={IVORY}
            strokeWidth={6}
            strokeLinejoin="round"
            strokeDasharray={`${drawn} ${total + 10}`}
          />
          <circle cx={tip.x} cy={tip.y} r={15} fill={IVORY} stroke={INK} strokeWidth={6} />
        </svg>
      )}
    </>
  );
}

export const GridData: React.FC<{ b: number; frame: number }> = ({ b, frame }) => {
  const caption = "144 cells, one rule";
  const typedCaption = caption.slice(0, Math.floor(clamp((b - 8.3) / 0.045, 0, caption.length)));
  const count = Math.round(900 * easeOutExpo(prog(b, 12.1, 14)));
  const statLine = "frames, each f(t)";
  const typedStat = statLine.slice(0, Math.floor(clamp((b - 12.4) / 0.04, 0, statLine.length)));
  const numberRise = easeOutExpo(prog(b, 12, 12.35));

  return (
    <div style={{ position: "absolute", inset: 0, background: INK }}>
      {b < 12 ? <Cells b={b} /> : <Chart b={b} />}
      {b < 11.2 && typedCaption && (
        <div
          style={{
            position: "absolute",
            left: CELL + 12,
            top: 7 * CELL + 30,
            padding: "6px 18px",
            background: INK,
            fontFamily: UI,
            fontSize: UI_SIZE,
            color: ivory(0.7),
            whiteSpace: "pre",
          }}
        >
          <span style={{ color: CLAY }}>03  </span>
          {typedCaption}
        </div>
      )}
      {b >= 12 && (
        <div style={{ position: "absolute", left: 96, top: 70 }}>
          <div style={{ overflow: "hidden", height: 300 }}>
            <div
              style={{
                fontFamily: DISPLAY,
                fontSize: 300,
                lineHeight: "300px",
                color: IVORY,
                transform: `translateY(${(1 - numberRise) * 100}%)`,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {count}
            </div>
          </div>
          <div style={{ fontFamily: UI, fontSize: UI_SIZE, color: ivory(0.7), marginTop: 6, whiteSpace: "pre" }}>
            <span style={{ color: CLAY }}>{typedStat ? "04  " : ""}</span>
            {typedStat}
          </div>
          <div style={{ fontFamily: UI, fontSize: UI_SIZE, color: CLAY, marginTop: 10, opacity: b >= 13 ? 1 : 0 }}>
            this is frame {String(frame).padStart(3, "0")}
          </div>
        </div>
      )}
    </div>
  );
};
