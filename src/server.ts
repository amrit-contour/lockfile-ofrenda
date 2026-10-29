import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { writeEulogy } from "./eulogy.ts";
import type { RegistryFacts } from "./registry.ts";
import { scanLockfile } from "./scan.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const publicDir = path.join(root, "public");

const app = new Hono();
const startedAt = new Date().toISOString();

function sendFile(name: string, type: string) {
  const body = readFileSync(path.join(publicDir, name), "utf8");
  return new Response(body, { headers: { "Content-Type": type } });
}

app.get("/api/health", (c) =>
  c.json({
    ok: true,
    startedAt,
    model: process.env.GHOST_MODEL ?? "gemma3:4b",
    ollama: process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434",
  }),
);

app.get("/api/sample", async (c) => {
  const text = readFileSync(path.join(root, "samples/demo-lock.json"), "utf8");
  const scan = await scanLockfile(text);
  return c.json(scan);
});

app.post("/api/scan", async (c) => {
  try {
    const body = await c.req.json<{ lockfile?: unknown; text?: string }>();
    const input = body.text ?? body.lockfile;
    if (input == null) return c.json({ error: "lockfile or text is required" }, 400);
    const scan = await scanLockfile(input);
    return c.json(scan);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Scan failed";
    return c.json({ error: detail }, 400);
  }
});

app.post("/api/eulogy", async (c) => {
  try {
    const facts = await c.req.json<RegistryFacts>();
    if (!facts?.name) return c.json({ error: "package facts are required" }, 400);
    const result = await writeEulogy(facts);
    return c.json(result);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Eulogy failed";
    return c.json({ error: detail }, 500);
  }
});

app.get("/", () => sendFile("index.html", "text/html; charset=utf-8"));
app.get("/app.js", () => sendFile("app.js", "text/javascript; charset=utf-8"));
app.get("/styles.css", () => sendFile("styles.css", "text/css; charset=utf-8"));

const port = Number(process.env.PORT ?? "8788");
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Lockfile Ofrenda on http://localhost:${info.port}`);
});
