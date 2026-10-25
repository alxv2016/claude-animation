import { AbsoluteFill } from "remotion";
import { ReelFrame } from "./Reel";
import { FPS, timeAtBeat } from "./time";

// One frame per beat, one bar per row, for reviewing the film at a glance.

const THUMB_W = 480;
const THUMB_H = 270;
const GAP = 16;
export const SHEET_W = 4 * THUMB_W + 5 * GAP;
export const SHEET_H = 8 * (THUMB_H + GAP) + GAP;

/** `beats` overrides the default one-per-beat sampling, e.g. to scrub a transition. */
export const ContactSheet: React.FC<{ phase: number; beats?: number[] }> = ({ phase, beats }) => (
  <AbsoluteFill style={{ background: "#2a2a28" }}>
    {(beats ?? Array.from({ length: 32 }, (_, i) => i + phase)).map((beat, i) => {
      const frame = Math.max(0, Math.round(timeAtBeat(beat) * FPS));
      return (
        <div
          key={i}
          style={{
            position: "absolute",
            left: GAP + (i % 4) * (THUMB_W + GAP),
            top: GAP + Math.floor(i / 4) * (THUMB_H + GAP),
            width: THUMB_W,
            height: THUMB_H,
            overflow: "hidden",
          }}
        >
          <div style={{ width: 1920, height: 1080, transform: `scale(${THUMB_W / 1920})`, transformOrigin: "top left" }}>
            <ReelFrame frame={frame} />
          </div>
          <div style={{ position: "absolute", left: 6, top: 4, font: "600 18px monospace", color: "#fff", background: "rgba(0,0,0,0.6)", padding: "0 6px" }}>
            b{beat.toFixed(2)} · f{frame}
          </div>
        </div>
      );
    })}
  </AbsoluteFill>
);
