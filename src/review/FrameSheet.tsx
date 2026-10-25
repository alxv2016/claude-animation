import { AbsoluteFill, Freeze, Sequence } from "remotion";
import { EffectsShowcase } from "../effects/showcase/EffectsShowcase";
import { LiquidGlassDemo } from "../effects/showcase/LiquidGlassDemo";
import { LiquidGlassTabBar } from "../effects/showcase/LiquidGlassTabBar";

// Any registered composition at chosen frames, in one grid: the contact-sheet review
// for compositions other than the reel. node render.mjs frames <target> <f,f,…>

export const SHEET_TARGETS = {
  EffectsShowcase: { component: EffectsShowcase, width: 1920, height: 1080 },
  LiquidGlassDemo: { component: LiquidGlassDemo, width: 1080, height: 1920 },
  LiquidGlassTabBar: { component: LiquidGlassTabBar, width: 1920, height: 1080 },
} as const;

export type FrameSheetProps = { target: keyof typeof SHEET_TARGETS; frames: number[] };

const COLS = 4;
const GAP = 16;
const thumb = (target: FrameSheetProps["target"]) => {
  const t = SHEET_TARGETS[target];
  const w = t.width >= t.height ? 480 : 270;
  return { w, h: Math.round((w * t.height) / t.width), scale: w / t.width };
};

export const sheetSize = ({ target, frames }: FrameSheetProps) => {
  const { w, h } = thumb(target);
  const rows = Math.ceil(frames.length / COLS);
  // Frozen frames are clamped to the composition's length, so the sheet spans them all.
  return { width: COLS * w + (COLS + 1) * GAP, height: rows * (h + GAP) + GAP, durationInFrames: Math.max(1, ...frames) + 1 };
};

export const FrameSheet: React.FC<FrameSheetProps> = ({ target, frames }) => {
  const { component: Target, width, height } = SHEET_TARGETS[target];
  const { w, h, scale } = thumb(target);
  return (
    <AbsoluteFill style={{ background: "#2a2a28" }}>
      {frames.map((f, i) => (
        <div key={i} style={{ position: "absolute", left: GAP + (i % COLS) * (w + GAP), top: GAP + Math.floor(i / COLS) * (h + GAP), width: w, height: h, overflow: "hidden" }}>
          <div style={{ width, height, transform: `scale(${scale})`, transformOrigin: "top left", position: "relative" }}>
            <Freeze frame={f}>
              {/* Children see the target's size in useVideoConfig, not the sheet's. */}
              <Sequence width={width} height={height} layout="none">
                <Target />
              </Sequence>
            </Freeze>
          </div>
          <div style={{ position: "absolute", left: 6, top: 4, font: "600 18px monospace", color: "#fff", background: "rgba(0,0,0,0.6)", padding: "0 6px" }}>f{f}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
};
