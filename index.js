const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const host = "0.0.0.0";
const port = Number(process.env.PORT || 8080);
const rootDir = __dirname;
const indexPath = path.join(rootDir, "index.html");

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

function sendFile(req, res, filePath, statusCode = 200) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Internal Server Error");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    res.writeHead(statusCode, {
      "Content-Type": mimeTypes[extension] || "application/octet-stream",
      "Content-Length": Buffer.byteLength(content),
      "Cache-Control": filePath === indexPath ? "no-cache" : "public, max-age=3600",
    });

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad Request");
    return;
  }

  if (!["GET", "HEAD"].includes(req.method || "")) {
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Method Not Allowed");
    return;
  }

  const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (requestUrl.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  const decodedPath = decodeURIComponent(requestUrl.pathname);
  const requestedPath =
    decodedPath === "/" ? indexPath : path.join(rootDir, decodedPath.replace(/^\/+/, ""));

  if (!requestedPath.startsWith(rootDir)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.stat(requestedPath, (error, stats) => {
    if (!error && stats.isFile()) {
      sendFile(req, res, requestedPath);
      return;
    }

    sendFile(req, res, indexPath);
  });
});

server.listen(port, host, () => {
  console.log(`Server listening on http://${host}:${port}`);
});
