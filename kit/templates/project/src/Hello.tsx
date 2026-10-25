import { useCurrentFrame, useVideoConfig } from "remotion";
import { LiquidGlass } from "./motion-kit/effects";
import { SKY_FRAGMENT, skyUniforms } from "./motion-kit/effects/backgrounds/Sky";
import { springKD } from "./motion-kit/lib/math";

// Starter composition: a liquid-glass capsule rising over drifting clouds.
// Every value comes from the frame number, so any frame renders the same every time.
export const Hello: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const rise = springKD(frame / fps - 0.3, 170, 26);
  const w = 760;
  const h = 180;
  return (
    <LiquidGlass
      backdrop={{ shader: { fragment: SKY_FRAGMENT, uniforms: skyUniforms({ cover: 0.55, sharpness: 0.6 }) } }}
      panels={[{ x: (width - w) / 2, y: height / 2 - h / 2 + (1 - rise) * 80, width: w, height: h }]}
      glass={{ refraction: 110, bevel: 80, frost: 0.5 }}
    >
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", transform: `translateY(${(1 - rise) * 80}px)`, font: "600 72px system-ui, sans-serif", color: "#fff" }}>
        Hello, motion-kit
      </div>
    </LiquidGlass>
  );
};
