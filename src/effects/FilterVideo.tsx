import { AbsoluteFill, Html5Audio, staticFile, type CalculateMetadataFunction } from "remotion";
import { Dither, type DitherProps } from "./filters/Dither";
import { PixelField, type PixelFieldProps } from "./filters/PixelField";
import { GradientMap, type GradientMapProps } from "./filters/GradientMap";

// One composition that runs a filter over a whole video, keeping its sound
// (.agents/skills/apply-effect/references/catalog.md#filter-a-whole-video; `npx motion-kit filter`). The CLI reads the video's size, rate and
// length with ffprobe and passes them in, so the render matches the source.

export type FilterVideoProps = {
  /** Video path under public/. */
  src: string;
  effect: "dither" | "pixel" | "gradient-map";
  /** Props for the effect component, minus `source`. */
  params?: Partial<DitherProps> | Partial<PixelFieldProps> | Partial<GradientMapProps>;
  /** Play the video's own audio track. */
  audio?: boolean;
  width?: number;
  height?: number;
  fps?: number;
  durationInFrames?: number;
};

export const FilterVideo: React.FC<FilterVideoProps> = ({ src, effect, params = {}, audio = true }) => {
  const source = { video: src };
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {effect === "dither" && <Dither {...(params as DitherProps)} source={source} />}
      {effect === "pixel" && <PixelField {...(params as PixelFieldProps)} source={source} />}
      {effect === "gradient-map" && <GradientMap colors={["#000000", "#ffffff"]} {...(params as Partial<GradientMapProps>)} source={source} />}
      {audio && <Html5Audio src={staticFile(src)} />}
    </AbsoluteFill>
  );
};

export const filterVideoMetadata: CalculateMetadataFunction<FilterVideoProps> = ({ props }) => ({
  width: props.width ?? 1920,
  height: props.height ?? 1080,
  fps: props.fps ?? 30,
  durationInFrames: props.durationInFrames ?? 300,
});
