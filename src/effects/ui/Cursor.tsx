import { useCurrentFrame, useVideoConfig } from "remotion";
import { springKD, track } from "../../lib/math";

// A scripted cursor (product films, UI motion): follows keyframes on springs, leans into its
// motion, and presses on each click with a ring. Pure function of time — the video replacement
// for a real pointer (.agents/skills/make-motion-film/types/product-film.md).

export type CursorProps = {
  /**
   * Keyframes [time s, x px, y px], sorted by time. A keyframe's time is when the move *starts*:
   * on the default spring the cursor is 94 % of the way there 0.35 s later, so start each move at
   * least 0.35 s before the click it leads to.
   */
  path: readonly (readonly [number, number, number])[];
  /** Click times in seconds. */
  clicks?: readonly number[];
  /** Arrow height in px. */
  size?: number;
  color?: string;
  /** Click ring colour; usually the accent. */
  ringColor?: string;
  /** Spring for travel (react-spring units); stiffer = snappier. */
  stiffness?: number;
  damping?: number;
  time?: number;
};

const ARROW = "M0 0 L0 22 L6 16.5 L10.5 26 L14 24.4 L9.6 15 L17 15 Z";

export const Cursor: React.FC<CursorProps> = ({ path, clicks = [], size = 44, color = "#ffffff", ringColor = "#ffffff", stiffness = 170, damping = 26, time }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = time ?? frame / fps;
  const xs = path.map(([at, x]) => [at, x] as const);
  const ys = path.map(([at, , y]) => [at, y] as const);
  const x = track(t, xs, stiffness, damping);
  const y = track(t, ys, stiffness, damping);
  const vx = (track(t + 1 / 120, xs, stiffness, damping) - track(t - 1 / 120, xs, stiffness, damping)) * 60;
  const lean = Math.max(-14, Math.min(14, vx / 120));
  const last = clicks.filter((c) => c <= t).at(-1);
  const since = last === undefined ? Infinity : t - last;
  const press = since < 0.3 ? 1 - 0.18 * Math.sin(Math.PI * Math.min(1, since / 0.18)) : 1;
  const ring = since < 0.6 ? springKD(since, 120, 20) : 0;
  const scale = size / 26;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, transform: `translate(${x}px, ${y}px)`, pointerEvents: "none" }}>
      {ring > 0 && (
        <div
          style={{
            position: "absolute",
            left: -size * 0.6 * ring,
            top: -size * 0.6 * ring,
            width: size * 1.2 * ring,
            height: size * 1.2 * ring,
            borderRadius: "50%",
            border: `${Math.max(1, 3 * (1 - ring))}px solid ${ringColor}`,
            opacity: 1 - ring,
          }}
        />
      )}
      <svg width={18 * scale} height={27 * scale} viewBox="-0.5 -0.5 18 27" style={{ transform: `rotate(${lean}deg) scale(${press})`, transformOrigin: "0 0", overflow: "visible" }}>
        <path d={ARROW} fill={color} stroke="rgba(0,0,0,0.55)" strokeWidth={1.2} strokeLinejoin="round" />
      </svg>
    </div>
  );
};
