import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, springKD } from "../../lib/math";

// A real screenshot that builds itself element by element (product films: "the UI assembles
// itself piece by piece"). Each piece is one real element of the image — a card, a row, a screen,
// a device — given as a rectangle; it springs into its own slot, staggered in order or outward from
// a point. The pixels are the real product, never a redrawing, and the image is never cut along
// lines that are not in it (.agents/skills/make-motion-film/types/product-film.md).

/** One element of the image, as fractions of the image's width and height. */
export type AssemblePiece = { x: number; y: number; w: number; h: number; radius?: number };

export type AssembleProps = {
  /** Image path under public/ (for example a brand capture's screenshot) or a URL. */
  src: string;
  /** Where the whole image sits, in px. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** The elements, measured on the image: each lands in its own slot. */
  pieces: readonly AssemblePiece[];
  /** Start time in seconds and stagger per step, in seconds. */
  start: number;
  stagger?: number;
  /** Order of arrival: the `pieces` order, or distance from `origin`. */
  order?: "index" | "origin";
  /** How a piece arrives: rises inside its own slot's mask, lifts and scales up, or flies from `origin`. */
  from?: "rise" | "lift" | "origin";
  /** 0–1 point of the image for `order: "origin"` and `from: "origin"`. */
  origin?: [number, number];
  /** Lift distance in px for `from: "lift"`. */
  travel?: number;
  /**
   * `"none"`: only the pieces draw (elements on a plain ground, like devices on white).
   * A colour: the whole image draws, with each slot painted this colour until its piece lands —
   * the container's own fill, so the container is there first and its content assembles in it.
   */
  base?: "none" | string;
  /** Spring for each piece (react-spring units); 220/24 overshoots a touch. */
  stiffness?: number;
  damping?: number;
  /** Corner radius in px for every piece, unless the piece sets its own (in px of the placed image). */
  radius?: number;
  time?: number;
};

export const Assemble: React.FC<AssembleProps> = ({
  src,
  x,
  y,
  width,
  height,
  pieces,
  start,
  stagger = 0.06,
  order = "index",
  from = "lift",
  origin = [0.5, 0.5],
  travel = 80,
  base = "none",
  stiffness = 220,
  damping = 24,
  radius = 0,
  time,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = time ?? frame / fps;
  const url = /^(https?:|data:|\/)/.test(src) ? src : staticFile(src);
  const centre = (p: AssemblePiece) => [p.x + p.w / 2, p.y + p.h / 2] as const;
  const dist = (p: AssemblePiece) => Math.hypot((centre(p)[0] - origin[0]) * width, (centre(p)[1] - origin[1]) * height);
  // Rank: index, or distance from the origin in steps of the median piece size.
  const step = Math.max(1, [...pieces].map((p) => Math.min(p.w * width, p.h * height)).sort((a, b) => a - b)[pieces.length >> 1] ?? 1);
  const rank = (p: AssemblePiece, i: number) => (order === "index" ? i : dist(p) / step);

  return (
    <div style={{ position: "absolute", left: x, top: y, width, height }}>
      {base !== "none" && (
        <>
          <Img src={url} style={{ position: "absolute", left: 0, top: 0, width, height }} />
          {pieces.map((p, i) => (
            <div key={i} style={{ position: "absolute", left: p.x * width, top: p.y * height, width: p.w * width, height: p.h * height, background: base, borderRadius: p.radius ?? radius }} />
          ))}
        </>
      )}
      {pieces.map((p, i) => {
        const s = springKD(t - start - rank(p, i) * stagger, stiffness, damping);
        if (s <= 0.001) return null;
        const left = p.x * width;
        const top = p.y * height;
        const w = p.w * width;
        const h = p.h * height;
        const crop = <Img src={url} style={{ position: "absolute", left: -left, top: -top, width, height }} />;
        if (from === "rise") {
          // A fixed mask on the slot; the element's own crop rises inside it.
          return (
            <div key={i} style={{ position: "absolute", left, top, width: w, height: h, overflow: "hidden", borderRadius: p.radius ?? radius }}>
              <div style={{ position: "absolute", inset: 0, overflow: "hidden", transform: `translateY(${(1 - s) * 100}%)` }}>{crop}</div>
            </div>
          );
        }
        const [cx, cy] = centre(p);
        const dx = from === "origin" ? (origin[0] - cx) * width * (1 - s) : 0;
        const dy = from === "origin" ? (origin[1] - cy) * height * (1 - s) : travel * (1 - s);
        const scale = from === "origin" ? 0.4 + 0.6 * s : 0.86 + 0.14 * s;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left,
              top,
              width: w,
              height: h,
              overflow: "hidden",
              borderRadius: p.radius ?? radius,
              opacity: clamp(s * 4),
              transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
            }}
          >
            {crop}
          </div>
        );
      })}
    </div>
  );
};
