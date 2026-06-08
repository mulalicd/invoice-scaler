#!/usr/bin/env node
/**
 * Fail-on-new-error gate.
 *
 * Compares two JSON reports of error counts (baseline vs current) and fails
 * if new 403 / stack-trace errors appeared. Designed to be wired into CI
 * after Playwright collects logged errors. Writes a markdown summary to
 * $GITHUB_STEP_SUMMARY (and stdout) and a PR comment file at
 * ./error-gate-comment.md.
 *
 * Usage:
 *   node scripts/error-gate.mjs <baseline.json> <current.json>
 *
 * JSON shape (either file may be missing — treated as zero):
 *   { "forbidden": number, "stack": number, "total": number,
 *     "samples": [{ "message": string, "source"?: string }] }
 */
import fs from "node:fs";
import path from "node:path";

const [, , baselinePath, currentPath] = process.argv;
const read = (p) => {
  if (!p || !fs.existsSync(p)) return { forbidden: 0, stack: 0, total: 0, samples: [] };
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch { return { forbidden: 0, stack: 0, total: 0, samples: [] }; }
};

const baseline = read(baselinePath);
const current = read(currentPath);

const delta = {
  forbidden: current.forbidden - baseline.forbidden,
  stack: current.stack - baseline.stack,
  total: current.total - baseline.total,
};

const newSamples = (current.samples ?? []).slice(0, 10);
const failed = delta.forbidden > 0 || delta.stack > 0;

const lines = [];
lines.push(`## ${failed ? "❌" : "✅"} Error gate`);
lines.push("");
lines.push(`| Metrika | Baseline | Trenutno | Δ |`);
lines.push(`|---|---:|---:|---:|`);
lines.push(`| 403 / forbidden | ${baseline.forbidden} | ${current.forbidden} | ${delta.forbidden >= 0 ? "+" : ""}${delta.forbidden} |`);
lines.push(`| Stack traces | ${baseline.stack} | ${current.stack} | ${delta.stack >= 0 ? "+" : ""}${delta.stack} |`);
lines.push(`| Ukupno | ${baseline.total} | ${current.total} | ${delta.total >= 0 ? "+" : ""}${delta.total} |`);
if (newSamples.length) {
  lines.push("", "### Uzorci novih grešaka", "");
  for (const s of newSamples) lines.push(`- \`${s.source ?? "?"}\` — ${String(s.message ?? "").slice(0, 200)}`);
}
if (failed) lines.push("", "**Gate fail:** broj 403 ili stack-trace grešaka je porastao.");

const summary = lines.join("\n");
console.log(summary);

const stepSummary = process.env.GITHUB_STEP_SUMMARY;
if (stepSummary) fs.appendFileSync(stepSummary, summary + "\n");
fs.writeFileSync(path.resolve("error-gate-comment.md"), summary);

process.exit(failed ? 1 : 0);
