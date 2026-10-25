import { useCurrentFrame, useVideoConfig } from "remotion";
import { mixHex, springKD, swapAlpha, track } from "../../lib/math";

// One container that never cuts (UI-motion films): every state is the same element changing
// position, size, radius and fill on springs, while its content swaps behind a short blur —
// in after the morph starts, out before the next (.agents/skills/make-motion-film/types/ui-motion.md).

export type MorphState = {
  /** Time in seconds this state begins. */
  at: number;
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  /** Fill colour, hex. */
  fill: string;
  content?: React.ReactNode;
};

export type MorphBoxProps = {
  states: readonly MorphState[];
  /** Springs (react-spring units); keep damping high — at most a tiny overshoot. */
  stiffness?: number;
  damping?: number;
  /** Blur in px on content as it swaps. */
  blur?: number;
  shadow?: string;
  time?: number;
};

export const MorphBox: React.FC<MorphBoxProps> = ({ states, stiffness = 210, damping = 28, blur = 8, shadow = "0 18px 50px rgba(0,0,0,0.18)", time }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = time ?? frame / fps;
  const key = (k: "x" | "y" | "width" | "height" | "radius") => track(t, states.map((s) => [s.at, s[k]] as const), stiffness, damping);
  // Fill blends from the previous state's colour on the same spring.
  const i = states.filter((s) => s.at <= t).length - 1;
  const fill = i <= 0 ? states[0].fill : mixHex(states[i - 1].fill, states[i].fill, springKD(t - states[i].at, stiffness, damping));
  const [x, y, width, height, radius] = [key("x"), key("y"), key("width"), key("height"), key("radius")];
  return (
    <div style={{ position: "absolute", left: x, top: y, width, height, borderRadius: radius, background: fill, boxShadow: shadow, overflow: "hidden" }}>
      {states.map((s, i) => {
        if (!s.content) return null;
        const next = states[i + 1]?.at ?? Infinity;
        const a = swapAlpha(t, s.at, next);
        if (a <= 0) return null;
        return (
          <div key={i} style={{ position: "absolute", inset: 0, opacity: a, filter: a < 1 ? `blur(${(1 - a) * blur}px)` : undefined, display: "grid", placeItems: "center" }}>
            {s.content}
          </div>
        );
      })}
    </div>
  );
};
