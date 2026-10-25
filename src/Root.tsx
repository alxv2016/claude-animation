import { Composition } from "remotion";
import { Reel } from "./reel/Reel";
import { ContactSheet, SHEET_H, SHEET_W } from "./reel/ContactSheet";
import { DURATION_FRAMES, FPS, H, W } from "./reel/time";
import { EffectsShowcase, SHOWCASE_FRAMES } from "./effects/showcase/EffectsShowcase";
import { LiquidGlassDemo } from "./effects/showcase/LiquidGlassDemo";
import { LiquidGlassTabBar } from "./effects/showcase/LiquidGlassTabBar";
import { FrameSheet, sheetSize, type FrameSheetProps } from "./review/FrameSheet";
import { FilterVideo, filterVideoMetadata, type FilterVideoProps } from "./effects";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* motion-kit:films */}
      <Composition id="Reel" component={Reel} durationInFrames={DURATION_FRAMES} fps={FPS} width={W} height={H} />
      <Composition
        id="ContactSheet"
        component={ContactSheet}
        durationInFrames={1}
        fps={FPS}
        width={SHEET_W}
        height={SHEET_H}
        defaultProps={{ phase: 0 }}
      />
      <Composition id="EffectsShowcase" component={EffectsShowcase} durationInFrames={SHOWCASE_FRAMES} fps={FPS} width={W} height={H} />
      <Composition id="LiquidGlassTabBar" component={LiquidGlassTabBar} durationInFrames={360} fps={FPS} width={W} height={H} />
      <Composition id="LiquidGlassDemo" component={LiquidGlassDemo} durationInFrames={330} fps={FPS} width={1080} height={1920} />
      <Composition
        id="FilterVideo"
        component={FilterVideo}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ src: "samples/footage.mp4", effect: "dither" } as FilterVideoProps}
        calculateMetadata={filterVideoMetadata}
      />
      <Composition
        id="FrameSheet"
        component={FrameSheet}
        durationInFrames={1}
        fps={FPS}
        width={1000}
        height={1000}
        defaultProps={{ target: "EffectsShowcase", frames: [0] } as FrameSheetProps}
        calculateMetadata={({ props }) => sheetSize(props)}
      />
    </>
  );
};
