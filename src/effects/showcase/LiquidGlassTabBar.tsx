import { useCurrentFrame, useVideoConfig } from "remotion";
import { LiquidGlass, type GlassPanel } from "..";
import { SKY_FRAGMENT, skyUniforms } from "../backgrounds/Sky";
import { spring } from "../../reel/math";

// A floating liquid-glass tab bar over drifting clouds (docs/EFFECTS.md §7.3): clear
// glass whose curved ends wrap the sky around them, and a selection lens that travels
// between tabs with its leading edge on a faster spring than its trailing edge.

const W = 1920;
const H = 1080;
const BAR = { width: 640, height: 150 };
const BAR_X = (W - BAR.width) / 2;
const BAR_Y = (H - BAR.height) / 2;
const TABS = 4;
const TAB_W = (BAR.width - 40) / TABS;
const MOVES = [{ at: 0.9, to: 1 }, { at: 2.1, to: 2 }, { at: 3.3, to: 3 }, { at: 4.6, to: 0 }];

const tabAt = (t: number, freq: number) => MOVES.reduce((pos, m, i) => pos + (m.to - (i ? MOVES[i - 1].to : 0)) * spring(t - m.at, freq, 0.6), 0);

const ICONS = [
  "M4 11.5l8-6.5 8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z",
  "M10.5 4a6.5 6.5 0 1 1 0 13a6.5 6.5 0 0 1 0-13zM15.5 15.5L20 20",
  "M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4A4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z",
  "M12 11.5a3.6 3.6 0 1 0 0-7.2a3.6 3.6 0 0 0 0 7.2zM5 20.5a7 7 0 0 1 14 0",
];

export const LiquidGlassTabBar: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const lead = tabAt(t, 3.2);
  const trail = tabAt(t, 1.9);
  const lensLeft = BAR_X + 20 + Math.min(lead, trail) * TAB_W + 6;
  const lensRight = BAR_X + 20 + (Math.max(lead, trail) + 1) * TAB_W - 6;
  const panels: GlassPanel[] = [
    { x: BAR_X, y: BAR_Y, ...BAR },
    { x: lensLeft, y: BAR_Y - 10, width: lensRight - lensLeft, height: BAR.height + 20 },
  ];

  return (
    <LiquidGlass
      backdrop={{ shader: { fragment: SKY_FRAGMENT, uniforms: skyUniforms({ cover: 0.55, sharpness: 0.6, speed: 1.6 }) } }}
      panels={panels}
      glass={{ smooth: 30, refraction: 110, bevel: 72, frost: 0.5, shadow: 0.15, tintAmount: 0.05 }}
    >
      {ICONS.map((d, i) => {
        const cx = BAR_X + 20 + (i + 0.5) * TAB_W;
        const active = Math.round(lead) === i;
        return (
          <svg key={i} width={64} height={64} viewBox="0 0 24 24" style={{ position: "absolute", left: cx - 32, top: H / 2 - 32 }}>
            <path d={d} fill="none" stroke="#fff" strokeOpacity={active ? 1 : 0.85} strokeWidth={active ? 2 : 1.7} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      })}
    </LiquidGlass>
  );
};
