import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame, useRemotionEnvironment } from "remotion";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { Bounce, COUNTER, irisRadius } from "./scenes/Bounce";
import { Rows } from "./scenes/Rows";
import { GridData } from "./scenes/GridData";
import { Cube } from "./scenes/Cube";
import { Lanes } from "./scenes/Lanes";
import { Morph } from "./scenes/Morph";
import { Logo } from "./scenes/Logo";
import { INK } from "./theme";
import { noise1 } from "./math";
import { DURATION_FRAMES, FPS, beatAt, sec, timeAtBeat } from "./time";
import chapters from "./chapters.json";

const IMPACTS = [4, 16, 28];

/** The whole film as a pure function of the frame number (fractional frames allowed). */
export const ReelFrame: React.FC<{ frame: number }> = ({ frame }) => {
  const b = beatAt(frame / FPS);
  const shake = IMPACTS.reduce((s, k) => s + (b >= k ? 16 * Math.exp(-sec(b - k) / 0.09) : 0), 0);
  const iris = b < 4.3 ? `circle(${irisRadius(b)}px at ${COUNTER.x}px ${COUNTER.y}px)` : undefined;

  return (
    <AbsoluteFill style={{ background: INK, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translate(${noise1(b * 20, 5) * shake}px, ${noise1(b * 20, 6) * shake}px) scale(${1 + shake / 600})` }}>
        {b < 4.3 && <Bounce b={b} />}
        {b >= 7.3 && b < 16 && <GridData b={b} frame={Math.round(frame)} />}
        {b >= 4 && b < 8.1 && (
          <AbsoluteFill style={{ clipPath: iris }}>
            <Rows b={b} />
          </AbsoluteFill>
        )}
        {b >= 16 && b < 20 && <Cube b={b} />}
        {b >= 20 && b < 24 && <Lanes b={b} />}
        {b >= 24 && b < 28.45 && <Morph b={b} />}
        {b >= 28 && <Logo b={b} />}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const AtCurrentFrame: React.FC = () => <ReelFrame frame={useCurrentFrame()} />;

/** Empty sequences that only label the chapters as tracks on the Studio timeline. */
const ChapterTracks: React.FC = () => (
  <>
    {chapters.map((c, i) => {
      const from = Math.max(0, Math.round(timeAtBeat(c.start) * FPS));
      const next = chapters[i + 1];
      const to = next ? Math.round(timeAtBeat(next.start) * FPS) : DURATION_FRAMES;
      return <Sequence key={c.start} name={`${String(i + 1).padStart(2, "0")} ${c.name}`} from={from} durationInFrames={to - from} layout="none" />;
    })}
  </>
);

export const Reel: React.FC = () => {
  // 8 blur samples redraw every frame 8 times: final renders only, so Studio previews in real time.
  const { isRendering } = useRemotionEnvironment();
  return (
    <AbsoluteFill>
      {isRendering ? (
        <CameraMotionBlur samples={8} shutterAngle={180}>
          <AtCurrentFrame />
        </CameraMotionBlur>
      ) : (
        <AtCurrentFrame />
      )}
      <ChapterTracks />
      <Html5Audio src={staticFile("reel.wav")} />
    </AbsoluteFill>
  );
};
