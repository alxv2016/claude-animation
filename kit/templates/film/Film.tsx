import { AbsoluteFill, Composition, Html5Audio, staticFile, useCurrentFrame, useRemotionEnvironment } from "remotion";
import { beatClock, chapterAt } from "__KIT__/lib/film";
import { FORMATS, useLayout, type Format } from "__KIT__/lib/layout";
import { springKD } from "__KIT__/lib/math";
import { MotionBlur } from "__KIT__/effects";
import grid from "./beats.json";
import film from "./film.json";
import chapters from "./chapters.json";

// __TITLE__ — a motion-kit film. Every frame is a pure function of the beat number `b` (studio
// rule R1): scenes receive `b` and compute everything from it. Plan: brief.md. Score: score.mjs.

const clock = beatClock(grid);

/** Placeholder scene: the chapter's name rises out of a mask on its downbeat. Replace per chapter. */
const ChapterCard: React.FC<{ name: string; local: number }> = ({ name, local }) => {
  const { safe, unit } = useLayout();
  const rise = springKD(clock.sec(local), 220, 26);
  return (
    <div style={{ position: "absolute", left: safe.x, top: safe.y + safe.height * 0.62, height: 170 * unit, overflow: "hidden" }}>
      <div style={{ font: `600 ${140 * unit}px system-ui, sans-serif`, lineHeight: `${170 * unit}px`, color: "#f0eee6", transform: `translateY(${(1 - rise) * 100}%)` }}>
        {name}
      </div>
    </div>
  );
};

/** The whole film at beat `b`. Scenes switch on chapters (chapters.json, in beats). */
export const FilmFrame: React.FC<{ b: number }> = ({ b }) => {
  const { chapter, local } = chapterAt(chapters, b);
  return (
    <AbsoluteFill style={{ background: "#141413" }}>
      <ChapterCard key={chapter.start} name={chapter.name} local={local} />
    </AbsoluteFill>
  );
};

const AtFrame: React.FC = () => <FilmFrame b={clock.beatAt(useCurrentFrame() / film.fps)} />;

export const Film: React.FC = () => {
  // Motion blur only in final renders: 8 subframes per frame would stall Studio playback.
  const { isRendering } = useRemotionEnvironment();
  return (
    <AbsoluteFill>
      {isRendering ? (
        <MotionBlur samples={8} shutterAngle={180}>
          <AtFrame />
        </MotionBlur>
      ) : (
        <AtFrame />
      )}
      {film.audio && <Html5Audio src={staticFile(film.audio)} />}
    </AbsoluteFill>
  );
};

/** One composition per format, one timeline: `<id>` for the first format, then `<id>-9x16` etc. */
export const Compositions: React.FC = () => (
  <>
    {(film.formats as Format[]).map((format, i) => (
      <Composition
        key={format}
        id={i === 0 ? film.id : `${film.id}-${format.replace(":", "x")}`}
        component={Film}
        fps={film.fps}
        width={FORMATS[format][0]}
        height={FORMATS[format][1]}
        durationInFrames={film.durationInFrames}
      />
    ))}
  </>
);
