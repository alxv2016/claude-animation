import { Composition, registerRoot } from "remotion";
import { FilterVideo, filterVideoMetadata, type FilterVideoProps } from "../../src/effects/FilterVideo";

// The kit's own entry for `motion-kit filter`: works in any project, whatever its Root registers.
// Files are served from the project's public/ (render-core passes publicDir).
const FilterRoot: React.FC = () => (
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
);

registerRoot(FilterRoot);
