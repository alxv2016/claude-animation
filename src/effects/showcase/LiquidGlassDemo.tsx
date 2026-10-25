import { useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { LiquidGlass, type GlassPanel } from "..";
import { lerp, spring } from "../../lib/math";
import { SKY_FRAGMENT, skyUniforms } from "../backgrounds/Sky";

// iOS-style screen in liquid glass (docs/EFFECTS.md §7.3): a lock-screen widget, control
// tiles, two buttons that melt into one capsule, and a tab bar whose selection lens
// travels with leading and trailing edges on different springs, so it stretches.

const { fontFamily } = loadFont("normal", { weights: ["400", "600"], subsets: ["latin"] });
const W = 1080;

const TABS = 4;
const BAR = { x: 90, y: 1650, width: 900, height: 150 };
const TAB_W = BAR.width / TABS;
const MOVES = [{ at: 0.7, to: 1 }, { at: 1.9, to: 2 }, { at: 3.1, to: 3 }, { at: 4.3, to: 0 }];

/** Tab position (in tabs) as a sum of springs, one per move, with its own frequency. */
const tabAt = (t: number, freq: number) => MOVES.reduce((pos, m, i) => pos + (m.to - (i ? MOVES[i - 1].to : 0)) * spring(t - m.at, freq, 0.62), 0);

const Icon: React.FC<{ d: string; x: number; y: number; size?: number; active?: boolean }> = ({ d, x, y, size = 56, active }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ position: "absolute", left: x - size / 2, top: y - size / 2 }}>
    <path d={d} fill="none" stroke={active ? "#fff" : "rgba(255,255,255,0.75)"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ICONS = [
  "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  "M11 4a7 7 0 1 1 0 14a7 7 0 0 1 0-14zM16.5 16.5L21 21",
  "M9 18V6l11-2v12M9 18a3 3 0 1 1-6 0a3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0a3 3 0 0 1 6 0z",
  "M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
];

export const LiquidGlassDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // Selection lens: leading edge springs faster than the trailing edge.
  const lead = tabAt(t, 3.4);
  const trail = tabAt(t, 2.1);
  const left = BAR.x + Math.min(lead, trail) * TAB_W + 18;
  const right = BAR.x + (Math.max(lead, trail) + 1) * TAB_W - 18;
  const lens: GlassPanel = { x: left, y: BAR.y - 14, width: right - left, height: BAR.height + 28, radius: 80 };

  // Two buttons that meet, melt into one capsule, and part.
  const meet = spring(t - 1.2, 1.6, 0.7) - spring(t - 3.4, 1.6, 0.7);
  const gap = lerp(260, 0, meet);
  const buttons: GlassPanel[] = [
    { x: W / 2 - 75 - gap / 2 - 75, y: 1320, width: 150, height: 150 },
    { x: W / 2 - 75 + gap / 2 + 75, y: 1320, width: 150, height: 150 },
  ];

  const tiles: GlassPanel[] = [
    { x: 90, y: 760, width: 430, height: 430, radius: 64 },
    { x: 560, y: 760, width: 430, height: 200, radius: 64 },
    { x: 560, y: 990, width: 200, height: 200, radius: 64 },
    { x: 790, y: 990, width: 200, height: 200, radius: 64 },
  ];

  return (
    <LiquidGlass
      backdrop={{ shader: { fragment: SKY_FRAGMENT, uniforms: skyUniforms({ cover: 0.55, scale: 1.6, speed: 1.2 }) } }}
      panels={[{ ...BAR, radius: 75 }, lens, ...tiles, ...buttons]}
      glass={{ smooth: 36, frost: 2 }}
    >
      <div style={{ position: "absolute", left: 0, right: 0, top: 210, textAlign: "center", fontFamily, color: "#fff" }}>
        <div style={{ fontSize: 44, fontWeight: 600, opacity: 0.9 }}>Saturday, October 25</div>
        <div style={{ fontSize: 260, fontWeight: 600, lineHeight: 1, letterSpacing: -6 }}>9:41</div>
      </div>
      <div style={{ position: "absolute", left: 130, top: 800, fontFamily, color: "#fff" }}>
        <div style={{ fontSize: 40, fontWeight: 600 }}>Now Playing</div>
        <div style={{ fontSize: 34, opacity: 0.75, marginTop: 8 }}>Liquid Glass</div>
      </div>
      <Icon d={ICONS[2]} x={305} y={1060} size={140} active />
      <div style={{ position: "absolute", left: 600, top: 830, fontFamily, color: "#fff", fontSize: 40, fontWeight: 600 }}>Focus</div>
      <Icon d={ICONS[3]} x={660} y={1090} size={84} active />
      <Icon d={ICONS[1]} x={890} y={1090} size={84} active />
      {ICONS.map((d, i) => (
        <Icon key={i} d={d} x={BAR.x + (i + 0.5) * TAB_W} y={BAR.y + BAR.height / 2} active={Math.round(lead) === i} />
      ))}
    </LiquidGlass>
  );
};
