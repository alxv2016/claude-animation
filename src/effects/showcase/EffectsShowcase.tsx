import { AbsoluteFill, Sequence } from "remotion";
import { Dither, Gradient, GradientMap, GradientWaves, LiquidGlass, PixelField } from "..";
import { UI } from "../../reel/theme";

// Every effect for 2 s, for review and as usage examples (docs/EFFECTS.md §9).

const SECTION = 120;
const FOOTAGE = { video: "samples/footage.mp4" } as const;
const STILL = { image: "samples/still.png" } as const;
const INK = "#141413";
const CLAY = "#d97757";
const IVORY = "#f0eee6";

const Label: React.FC<{ name: string; detail: string }> = ({ name, detail }) => (
  <div style={{ position: "absolute", left: 64, bottom: 56, fontFamily: UI, fontSize: 40, color: "#fff", background: "rgba(0,0,0,0.55)", padding: "10px 20px", borderRadius: 10 }}>
    <b style={{ fontWeight: 500 }}>{name}</b> <span style={{ opacity: 0.7 }}>· {detail}</span>
  </div>
);

const SECTIONS: { name: string; detail: string; node: React.ReactNode }[] = [
  { name: "Gradient", detail: "mesh", node: <Gradient colors={["#0b1026", "#3b2b8f", CLAY, "#f3c9a8"]} type="mesh" speed={1.4} grain={0.07} /> },
  { name: "Gradient", detail: "linear + silk", node: <Gradient colors={[INK, "#5a3a8a", CLAY, IVORY]} type="linear" angle={30} bands={3} silk={0.9} warp={0.8} speed={1.2} /> },
  { name: "Gradient", detail: "conic, hard stops", node: <Gradient colors={[CLAY, "#f3c9a8", "#3b2b8f", CLAY]} type="conic" softness={0.15} warp={0.5} grain={0.1} speed={1.5} /> },
  { name: "GradientWaves", detail: "ray-marched swell", node: <GradientWaves speed={0.8} /> },
  {
    name: "PixelField",
    detail: "circles + beat ripples",
    node: <PixelField shape="circle" background="#0d0d10" color={CLAY} cellSize={16} ripples={[0.1, 0.7, 1.3].map((at, i) => ({ x: [0.3, 0.7, 0.5][i], y: [0.4, 0.6, 0.5][i], at }))} />,
  },
  { name: "Dither", detail: "background, bayer 8×8", node: <Dither mode="bayer8" pixelSize={4} palette={[INK, CLAY, IVORY]} waveSpeed={0.5} /> },
  { name: "Dither", detail: "halftone filter over video", node: <Dither source={FOOTAGE} mode="halftone" pixelSize={9} palette={[INK, IVORY]} angle={45} contrast={1.2} /> },
  { name: "Dither", detail: "bayer 4×4 filter over image", node: <Dither source={STILL} mode="bayer4" pixelSize={3} palette={[INK, "#7a4a3a", CLAY, IVORY]} /> },
  { name: "PixelField", detail: "mosaic filter over video", node: <PixelField source={FOOTAGE} shape="square" cellSize={14} sourceColor background={INK} /> },
  { name: "GradientMap", detail: "tritone + grain over video", node: <GradientMap source={FOOTAGE} colors={["#1b1340", CLAY, "#fff1d6"]} grain={0.08} /> },
  {
    name: "LiquidGlass",
    detail: "clear glass over an image",
    node: (
      <LiquidGlass
        backdrop={STILL}
        panels={[
          { x: 360, y: 300, width: 520, height: 320, radius: 48 },
          { x: 1000, y: 300, width: 560, height: 140, radius: 70 },
          { x: 1000, y: 480, width: 260, height: 140, radius: 70 },
          { x: 1300, y: 480, width: 260, height: 140, radius: 70 },
        ]}
        glass={{ frost: 0 }}
      >
        <div style={{ position: "absolute", left: 360, top: 300, width: 520, height: 320, display: "grid", placeItems: "center", fontFamily: UI, fontSize: 96, color: "#fff" }}>9:41</div>
      </LiquidGlass>
    ),
  },
];

export const SHOWCASE_FRAMES = SECTIONS.length * SECTION;

export const EffectsShowcase: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    {SECTIONS.map((s, i) => (
      <Sequence key={i} from={i * SECTION} durationInFrames={SECTION} name={`${s.name} · ${s.detail}`}>
        <AbsoluteFill>{s.node}</AbsoluteFill>
        <Label name={s.name} detail={s.detail} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
