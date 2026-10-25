// Serves the reel demo page: node demo/serve.mjs [port]
// The film is served with HTTP range support so the browser can seek it.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const PORT = Number(process.argv[2] ?? 4173);
const ROUTES = {
  "/": ["demo/index.html", "text/html; charset=utf-8"],
  "/reel.mp4": ["out/reel.mp4", "video/mp4"],
  "/sheet.png": ["out/sheet.png", "image/png"],
  "/beats.json": ["src/reel/beats.json", "application/json"],
  "/chapters.json": ["src/reel/chapters.json", "application/json"],
};

http
  .createServer((req, res) => {
    const route = ROUTES[new URL(req.url, "http://x").pathname];
    const file = route && path.resolve(route[0]);
    if (!file || !fs.existsSync(file)) {
      res.writeHead(404).end("not found");
      return;
    }
    const size = fs.statSync(file).size;
    const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? "");
    if (range) {
      const start = range[1] ? Number(range[1]) : size - Number(range[2]);
      const end = range[1] && range[2] ? Number(range[2]) : size - 1;
      res.writeHead(206, {
        "Content-Type": route[1],
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": end - start + 1,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
      });
      fs.createReadStream(file, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, { "Content-Type": route[1], "Content-Length": size, "Accept-Ranges": "bytes", "Cache-Control": "no-store" });
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, () => {
    for (const f of ["out/reel.mp4", "out/sheet.png"]) {
      if (!fs.existsSync(f)) console.warn(`missing ${f}: run ${f.endsWith("mp4") ? "npm run render" : "npm run sheet"}`);
    }
    console.log(`Reel demo: http://localhost:${PORT}`);
  });
