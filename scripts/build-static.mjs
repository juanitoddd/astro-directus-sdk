#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { copyFile, rename, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const target = resolve(root, "src/pages/[lang]/[...slug].astro");
const variant = resolve(root, "src/page-variants/slug-static.astro");
const backup = `${target}.ssr.bak`;

if (!existsSync(variant)) {
  console.error(`Static variant not found: ${variant}`);
  process.exit(1);
}
if (!existsSync(target)) {
  console.error(`Target route not found: ${target}`);
  process.exit(1);
}
if (existsSync(backup)) {
  console.error(`Stale backup exists at ${backup}. Inspect and remove it before retrying.`);
  process.exit(1);
}

function getCliArg(name) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((a) => a.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const idx = process.argv.findIndex((a) => a === `--${name}`);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return undefined;
}

const outDir = getCliArg("out-dir");
const astroArgs = ["build"];
if (outDir) astroArgs.push("--outDir", outDir);

const astroBin = resolve(root, "node_modules/.bin/astro");
if (!existsSync(astroBin)) {
  console.error(`Astro binary not found at ${astroBin}. Run \`npm install\` first.`);
  process.exit(1);
}

await rename(target, backup);
let exitCode = 0;
try {
  await copyFile(variant, target);
  const result = spawnSync(astroBin, astroArgs, { stdio: "inherit", cwd: root, shell: false });
  exitCode = result.status ?? 1;
} finally {
  await rm(target, { force: true });
  await rename(backup, target);
}
process.exit(exitCode);
