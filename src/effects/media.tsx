import { useRef } from "react";
import { Img, OffthreadVideo, staticFile } from "remotion";
import { ShaderCanvas, type ShaderHandle } from "./ShaderCanvas";
import type { Uniforms } from "./gl";

// Feeds a video or image into a shader as the `uSource` texture, so any effect can
// run as a filter over footage (.agents/skills/apply-effect/references/catalog.md#filters). The media element stays in the
// DOM, invisible; each decoded frame is uploaded and the shader redrawn.

export type MediaInput =
  /** Path under public/ (passed to staticFile) or an absolute URL. */
  | { video: string; trimBefore?: number }
  | { image: string };

const resolve = (src: string) => (/^(https?:|data:|\/)/.test(src) ? src : staticFile(src));
const HIDDEN: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, pointerEvents: "none" };

export const MediaFeed: React.FC<{ source: MediaInput; onFrame: (frame: TexImageSource) => void }> = ({ source, onFrame }) =>
  "video" in source ? (
    // onVideoFrame types frames as CanvasImageSource; in practice an <img>, <video> or VideoFrame.
    <OffthreadVideo src={resolve(source.video)} trimBefore={source.trimBefore} muted onVideoFrame={(f) => onFrame(f as TexImageSource)} style={HIDDEN} />
  ) : (
    <Img src={resolve(source.image)} onLoad={(e) => onFrame(e.currentTarget)} style={HIDDEN} />
  );

export type EffectLayerProps = {
  fragment: string;
  uniforms: Uniforms;
  /** Filter mode when set; background mode otherwise. */
  source?: MediaInput;
  time?: number;
  resolution?: number;
  pixelated?: boolean;
  style?: React.CSSProperties;
};

/** A ShaderCanvas whose `uSource` is a live media frame; `uHasSource` is 1 in filter mode. */
export const EffectLayer: React.FC<EffectLayerProps> = ({ fragment, uniforms, source, time, resolution, pixelated, style }) => {
  const handle = useRef<ShaderHandle>(null);
  const frame = useRef<TexImageSource | null>(null);
  return (
    <>
      {source && (
        <MediaFeed
          source={source}
          onFrame={(f) => {
            frame.current = f;
            handle.current?.draw();
          }}
        />
      )}
      <ShaderCanvas
        ref={handle}
        fragment={fragment}
        uniforms={{ ...uniforms, uHasSource: source ? 1 : 0 }}
        textures={source ? { uSource: () => frame.current } : undefined}
        time={time}
        scale={resolution}
        pixelated={pixelated}
        style={style}
      />
    </>
  );
};
