import { Composition } from "remotion";
import { Hello } from "./Hello";
import { FilterVideo, filterVideoMetadata, type FilterVideoProps } from "./motion-kit/effects";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Hello" component={Hello} durationInFrames={180} fps={60} width={1920} height={1080} />
    {/* Used by `npx motion-kit filter`; size, rate and length come from the input video. */}
    <Composition
      id="FilterVideo"
      component={FilterVideo}
      durationInFrames={300}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ src: "", effect: "dither" } as FilterVideoProps}
      calculateMetadata={filterVideoMetadata}
    />
  </>
);
