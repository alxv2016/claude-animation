// Minimal PNG decoder for analysis: 8-bit greyscale, RGB and RGBA, all five row filters.
// Remotion's bundled ffmpeg writes PNG but has no raw-video or PGM output, so frames go through this.
import fs from "node:fs";
import zlib from "node:zlib";

/** Decodes a PNG file to { width, height, channels, data } with `data` as 8-bit samples. */
export function readPng(file) {
  const b = fs.readFileSync(file);
  let o = 8, width = 0, height = 0, channels = 0;
  const idat = [];
  while (o < b.length) {
    const len = b.readUInt32BE(o);
    const type = b.toString("ascii", o + 4, o + 8);
    const d = b.subarray(o + 8, o + 8 + len);
    if (type === "IHDR") {
      width = d.readUInt32BE(0);
      height = d.readUInt32BE(4);
      if (d[8] !== 8) throw new Error(`${file}: only 8-bit PNG is supported`);
      channels = { 0: 1, 2: 3, 6: 4 }[d[9]];
      if (!channels || d[12] !== 0) throw new Error(`${file}: unsupported colour type or interlacing`);
    }
    if (type === "IDAT") idat.push(d);
    o += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const data = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const r = raw[y * (stride + 1) + 1 + x];
      const a = x >= channels ? data[y * stride + x - channels] : 0;
      const u = y ? data[(y - 1) * stride + x] : 0;
      const c = x >= channels && y ? data[(y - 1) * stride + x - channels] : 0;
      let v = r;
      if (filter === 1) v = r + a;
      else if (filter === 2) v = r + u;
      else if (filter === 3) v = r + ((a + u) >> 1);
      else if (filter === 4) {
        const p = a + u - c, pa = Math.abs(p - a), pb = Math.abs(p - u), pc = Math.abs(p - c);
        v = r + (pa <= pb && pa <= pc ? a : pb <= pc ? u : c);
      }
      data[y * stride + x] = v & 255;
    }
  }
  return { width, height, channels, data };
}
