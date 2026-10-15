// Temporary check: boot the backend and the Vite dev server together, then make
// the same requests a browser makes -- including through Vite's /api proxy.
import { createServer as createHttpServer } from "node:http";
import { createServer as createViteServer } from "vite";
import { app } from "../server/src/index.js";

const api = app.listen(3000);
await new Promise((resolve) => api.once("listening", resolve));
console.log("backend listening on 3000");

const vite = await createViteServer({
  root: process.cwd(),
  appType: "spa",
  server: { middlewareMode: true },
});

const http = createHttpServer((request, response) => {
  vite.middlewares(request, response, () => {
    response.statusCode = 404;
    response.end("not found");
  });
});
await new Promise((resolve) => http.listen(5173, resolve));
console.log("frontend listening on 5173");

const page = await fetch("http://localhost:5173/");
const html = await page.text();
console.log(
  "GET / ->",
  page.status,
  html.includes('id="root"') ? "index.html served" : html.slice(0, 100),
);

const health = await fetch("http://localhost:5173/health");
console.log("GET /health via proxy ->", health.status, await health.text());

const empty = await fetch("http://localhost:5173/api/resume", {
  method: "POST",
  body: new FormData(),
});
console.log("POST /api/resume empty via proxy ->", empty.status, await empty.text());

// Now stop the backend and repeat, to see what the browser gets when it is down.
await new Promise((resolve) => api.close(resolve));
console.log("--- backend stopped ---");

try {
  const down = await fetch("http://localhost:5173/api/resume", {
    method: "POST",
    body: new FormData(),
    signal: AbortSignal.timeout(8000),
  });
  console.log("POST /api/resume (backend down) ->", down.status, JSON.stringify(await down.text()));
} catch (error) {
  console.log("POST /api/resume (backend down) -> threw", error.name, error.message);
}

const downHealth = await fetch("http://localhost:5173/health", {
  signal: AbortSignal.timeout(8000),
});
console.log("GET /health (backend down) ->", downHealth.status, JSON.stringify(await downHealth.text()));

await vite.close();
http.close();
