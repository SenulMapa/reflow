// Minimal static server with SPA fallback (serves index.html for unknown routes)
// so expo-router client routes like /progress and /cards render for screenshots.
import http from "http";
import fs from "fs";
import path from "path";
const ROOT = path.resolve("dist");
const PORT = Number(process.argv[2] || 8099);
const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".ttf": "font/ttf", ".png": "image/png",
  ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".map": "application/json", ".woff": "font/woff", ".woff2": "font/woff2",
};
http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  let file = path.join(ROOT, url);
  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
    return;
  }
  // SPA fallback
  res.writeHead(200, { "content-type": "text/html" });
  fs.createReadStream(path.join(ROOT, "index.html")).pipe(res);
}).listen(PORT, () => console.log(`SPA server on ${PORT}`));
