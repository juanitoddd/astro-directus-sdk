#!/usr/bin/env node
import express from "express";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const PORT = Number(process.env.WEBHOOK_PORT || 4400);
const HOST = process.env.WEBHOOK_HOST || "0.0.0.0";
const TOKEN = process.env.WEBHOOK_TOKEN;

if (!TOKEN) {
  console.error("WEBHOOK_TOKEN env var is required");
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: "64kb" }));

let inFlight = false;
let lastBuild = null;

function runDeploy(triggeredBy) {
  const startedAt = new Date().toISOString();
  inFlight = true;
  console.log(`[webhook] deploy started at ${startedAt}${triggeredBy ? ` (by ${triggeredBy})` : ""}`);

  const proc = spawn("bash", ["scripts/deploy.sh"], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  proc.stdout.on("data", (d) => process.stdout.write(d));
  proc.stderr.on("data", (d) => process.stderr.write(d));
  proc.on("close", (code) => {
    inFlight = false;
    const finishedAt = new Date().toISOString();
    const status = code === 0 ? "success" : "failure";
    lastBuild = { startedAt, finishedAt, status, exitCode: code, triggeredBy };
    console.log(`[webhook] deploy ${status} (exit ${code})`);
  });

  return startedAt;
}

app.post("/rebuild", (req, res) => {
  if (req.header("Authorization") !== `Bearer ${TOKEN}`) {
    return res.status(401).json({ error: "unauthorized" });
  }
  if (inFlight) {
    return res.status(409).json({ error: "build in progress", lastBuild });
  }
  const triggeredBy = req.body?.triggered_by ?? null;
  const startedAt = runDeploy(triggeredBy);
  res.status(202).json({ accepted: true, startedAt });
});

app.get("/status", (req, res) => {
  if (req.header("Authorization") !== `Bearer ${TOKEN}`) {
    return res.status(401).json({ error: "unauthorized" });
  }
  res.json({ inFlight, lastBuild });
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, HOST, () => {
  console.log(`webhook receiver listening on ${HOST}:${PORT}`);
});
