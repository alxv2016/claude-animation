import { CLAY, DISPLAY, INK, IVORY } from "../theme";
import { clamp, easeInCubic, easeOutExpo, prog } from "../math";

// Bar 1 (beats 4-8): the twelve principles of animation as diagonal marquee
// rows that snap one step per beat, then leave as blinds onto the grid.

const ROWS = [
  ["squash & stretch", "anticipation", "staging"],
  ["straight ahead", "pose to pose", "follow through"],
  ["slow in", "slow out", "arcs", "secondary action"],
  ["timing", "exaggeration", "solid drawing", "appeal"],
  ["anticipation", "staging", "squash & stretch"],
  ["follow through", "arcs", "timing", "appeal"],
];
const ROW_H = 260;

/** Beat-locked step: holds, then snaps to the next position in the first 40% of a beat. */
const stepped = (local: number) => Math.floor(local) + easeOutExpo(clamp((local - Math.floor(local)) / 0.4));

export const Rows: React.FC<{ b: number }> = ({ b }) => {
  const local = b - 4;
  return (
    <div style={{ position: "absolute", inset: 0, transform: `rotate(${-8 + local * 0.6}deg)` }}>
      {ROWS.map((words, i) => {
        const dir = i % 2 ? -1 : 1;
        const textX = (dir > 0 ? -5200 : -2400) + dir * (640 * stepped(local - i * 0.025) + 50 * local);
        const exit = easeInCubic(prog(b, 7.4 + i * 0.03, 7.9 + i * 0.03));
        const repeated = Array.from({ length: 6 }, () => words).flat();
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: -240 + i * ROW_H,
              left: -200,
              width: 2320,
              height: ROW_H + 1,
              background: CLAY,
              overflow: "hidden",
              transform: `translateX(${dir * 3200 * exit}px)`,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: textX,
                top: 0,
                whiteSpace: "nowrap",
                fontFamily: DISPLAY,
                fontSize: 220,
                lineHeight: `${ROW_H}px`,
                color: INK,
              }}
            >
              {repeated.map((w, k) => (
                <span key={k}>
                  <span style={{ fontStyle: k % 2 ? "italic" : "normal", color: k % 2 ? IVORY : INK }}>{w}</span>
                  <span style={{ color: IVORY, padding: "0 0.28em" }}>/</span>
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
