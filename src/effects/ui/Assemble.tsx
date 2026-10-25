import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { springKD } from "../../lib/math";

// A real screenshot that builds itself from tiles (product films: "the UI assembles itself piece
// by piece"). Each tile springs in from an offset, staggered by distance from `origin`. The image
// is the real product, never a redrawing (.agents/skills/make-motion-film/types/product-film.md).

export type AssembleProps = {
  /** Image path under public/ (for example a brand capture's screenshot) or a URL. */
  src: string;
  /** Where the assembled image sits, in px. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Tile grid. */
  cols?: number;
  rows?: number;
  /** Start time in seconds and stagger per tile step, in seconds. */
  start: number;
  stagger?: number;
  /** Tiles arrive from this far away (px) along the direction away from `origin`. */
  travel?: number;
  /** 0–1 point the assembly grows from. */
  origin?: [number, number];
  radius?: number;
  time?: number;
};

export const Assemble: React.FC<AssembleProps> = ({ src, x, y, width, height, cols = 6, rows = 4, start, stagger = 0.035, travel = 60, origin = [0.5, 0.5], radius = 16, time }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = time ?? frame / fps;
  const url = /^(https?:|data:|\/)/.test(src) ? src : staticFile(src);
  const tw = width / cols;
  const th = height / rows;
  const tiles = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const dx = (c + 0.5) / cols - origin[0];
      const dy = (r + 0.5) / rows - origin[1];
      const dist = Math.hypot(dx * cols, dy * rows);
      const p = springKD(t - start - dist * stagger, 260, 28);
      if (p <= 0.001) continue;
      const len = Math.hypot(dx, dy) || 1;
      tiles.push(
        <div
          key={`${r}-${c}`}
          style={{
            position: "absolute",
            left: c * tw,
            top: r * th,
            width: tw + 0.5,
            height: th + 0.5,
            overflow: "hidden",
            transform: `translate(${(dx / len) * travel * (1 - p)}px, ${(dy / len) * travel * (1 - p)}px) scale(${0.85 + 0.15 * Math.min(1, p)})`,
          }}
        >
          <Img src={url} style={{ position: "absolute", left: -c * tw, top: -r * th, width, height }} />
        </div>,
      );
    }
  }
  return <div style={{ position: "absolute", left: x, top: y, width, height, borderRadius: radius, overflow: "hidden" }}>{tiles}</div>;
};
