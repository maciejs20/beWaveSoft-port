// Compares the TSH screens editor preview with TSH Soft's own preview shots (PROJEKT-TSH-EDYTOR.md "Wierność
// podglądu", plan 2026-11-14 section 4.3). For each case it renders one screen record of a TSH Soft sample in the
// built app with the editor's preview at TSH's preview scale, crops the preview out of the TSH shot and measures the
// ink bounding box of each region given in keypad pixels, on both images, in the renderer page (canvas getImageData,
// no npm packages). TSH previews in the 1123x663 window start at 238/81 and are 617x361 (TSH2, scale 0.6023: the bar
// line runs over 617 columns, the grid line of x 210 is at column 127) or 632x358 (TSG2, scale 632/480).
// Usage: node tools/tsh-preview-compare.mjs <ws-url> <cases.json> <out dir> [case...]
//   ws-url    DevTools WebSocket of the app's renderer page (app started with --remote-debugging-port on an isolated
//             HOME; take the "page" entry of http://127.0.0.1:<port>/json)
//   cases     tools/tsh-compare-cases.json
//   out dir   receives report.json, <case>.png (TSH | editor | difference, regions green when within tolerance) and
//             <case>-editor.png (the editor's preview as captured)
// Shots are read from work/re-tsh/shots and samples from work/re-tsh/samples (Satel material, not in git). The harness
// is bundled from the current work/working/src, so the comparison shows the source under test; the app only gives the
// page, the fonts, themes.json and the theme pictures.
// Exit codes: 0 all regions within tolerance, 1 some region outside, 2 usage error or missing shots/samples.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";
import { inkBox, compareRegion, toKeypadBox } from "./tshCompareCore.mjs";

const TOOLS = path.dirname(fileURLToPath(import.meta.url));
const RE_TSH = path.resolve(TOOLS, "../../re-tsh");
const SRC = path.resolve(TOOLS, "../src");
// TSH preview geometry in the shots (measured: first preview row and column, last ones before the 253 gray frame);
// size and scale per keypad width.
const SHOT_ORIGIN = { x: 238, y: 81 };
const PREVIEW = { 1024: { width: 617, height: 361, scale: 0.6023 }, 480: { width: 632, height: 358, scale: 632 / 480 } };
// Viewport of the app page while rendering.
const VIEWPORT = { width: 1600, height: 1100 };

// Prints the usage and exits with code 2.
function usage(message) {
  if (message) console.error(message);
  console.error("Usage: node tools/tsh-preview-compare.mjs <ws-url> <cases.json> <out dir> [case...]");
  process.exit(2);
}

// Minimal CDP client over the global WebSocket (Node 22). Returns { call(method, params), close() }.
function connect(ws) {
  return new Promise((resolve, reject) => {
    const sock = new WebSocket(ws);
    let id = 0;
    const pending = new Map();
    sock.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (pending.has(d.id)) {
        pending.get(d.id)(d);
        pending.delete(d.id);
      }
    };
    sock.onerror = () => reject(new Error(`cannot connect to ${ws}`));
    sock.onopen = () => resolve({
      call: (method, params = {}) => new Promise((res) => {
        const i = ++id;
        pending.set(i, res);
        sock.send(JSON.stringify({ id: i, method, params }));
      }),
      close: () => sock.close()
    });
  });
}

// Evaluates an expression in the page (promises awaited). Returns its value; throws on an exception.
async function evaluate(cdp, expression) {
  const r = await cdp.call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.error) throw new Error(r.error.message);
  if (r.result.exceptionDetails) {
    throw new Error(JSON.stringify(r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails));
  }
  return r.result.result.value;
}

// Bundles the harness like the renderer build (JSX, React jsx-runtime alias). Returns the script text.
async function bundleHarness() {
  const r = await esbuild.build({
    entryPoints: [path.join(TOOLS, "tsh-preview-harness.js")], bundle: true, write: false, platform: "browser",
    format: "iife", loader: { ".js": "jsx" }, jsx: "automatic", logLevel: "error",
    external: ["electron", "realm", "mqtt"],
    alias: { "react/jsx-runtime": path.join(SRC, "renderer/lib/react/jsx-runtime.js") },
    define: { "process.env.NODE_ENV": '"production"' }
  });
  return r.outputFiles[0].text;
}

// In-page comparison of one case: draws both PNGs on canvases, measures the regions and builds the side-by-side
// picture. Runs in the renderer; the helpers come in as source text. Returns { regions, png }.
const PAGE_COMPARE = `async function (job) {
  ${inkBox.toString()}
  ${compareRegion.toString()}
  ${toKeypadBox.toString()}
  const load = (src) => new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = src; });
  const pixels = (img, sx, sy, w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d"); g.drawImage(img, sx, sy, w, h, 0, 0, w, h); return { canvas: c, data: g.getImageData(0, 0, w, h).data }; };
  const shot = await load(job.shot); const editor = await load(job.editor);
  const W = job.preview.width, H = job.preview.height, s = job.preview.scale;
  const tsh = pixels(shot, job.origin.x, job.origin.y, W, H);
  const ed = pixels(editor, 0, 0, W, H);
  const regions = job.regions.map((r) => {
    const bg = { color: r.background || job.background, threshold: r.threshold || job.threshold };
    const px = { left: r.rect[0] * s, top: r.rect[1] * s, width: r.rect[2] * s, height: r.rect[3] * s };
    const a = toKeypadBox(inkBox(tsh.data, W, H, px, bg), s);
    const b = toKeypadBox(inkBox(ed.data, W, H, px, bg), s);
    return Object.assign({ label: r.label, rect: r.rect, tsh: a, editor: b }, compareRegion(a, b, job.tolerance));
  });
  const out = document.createElement("canvas"); const gap = 10; out.width = 3 * W + 2 * gap; out.height = H;
  const g = out.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, out.width, out.height);
  g.drawImage(tsh.canvas, 0, 0); g.drawImage(ed.canvas, W + gap, 0);
  const diff = g.createImageData(W, H);
  for (let i = 0; i < diff.data.length; i += 4) {
    const d = Math.max(Math.abs(tsh.data[i] - ed.data[i]), Math.abs(tsh.data[i + 1] - ed.data[i + 1]), Math.abs(tsh.data[i + 2] - ed.data[i + 2]));
    diff.data[i] = 255; diff.data[i + 1] = 255 - Math.min(255, d * 2); diff.data[i + 2] = 255 - Math.min(255, d * 2); diff.data[i + 3] = 255;
  }
  g.putImageData(diff, 2 * (W + gap), 0);
  regions.forEach((r) => { g.strokeStyle = r.ok ? "#00a000" : "#e00000"; g.lineWidth = 1;
    [0, W + gap, 2 * (W + gap)].forEach((x0) => g.strokeRect(x0 + r.rect[0] * s + 0.5, r.rect[1] * s + 0.5, r.rect[2] * s, r.rect[3] * s)); });
  return { regions, png: out.toDataURL("image/png") };
}`;

// Reads a sample input (BOM tolerated). Returns the object.
function readSample(id) {
  const file = path.join(RE_TSH, "samples", `${id}.json`);
  if (!fs.existsSync(file)) usage(`missing sample ${file} (work/re-tsh/samples is Satel material outside git)`);
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^﻿/, ""));
}

async function main() {
  const [ws, casesFile, outDir, ...only] = process.argv.slice(2);
  if (!ws || !casesFile || !outDir) usage();
  const spec = JSON.parse(fs.readFileSync(casesFile, "utf8"));
  const cases = spec.cases.filter((c) => only.length === 0 || only.includes(c.name));
  if (cases.length === 0) usage(`no case named ${only.join(", ")}`);
  const missing = cases.map((c) => path.join(RE_TSH, "shots", c.shot)).filter((f) => !fs.existsSync(f));
  if (missing.length) usage(`missing TSH shots (work/re-tsh/shots, outside git):\n  ${missing.join("\n  ")}`);
  fs.mkdirSync(outDir, { recursive: true });
  const cdp = await connect(ws);
  await cdp.call("Emulation.setDeviceMetricsOverride", { ...VIEWPORT, deviceScaleFactor: 1, mobile: false });
  await evaluate(cdp, `(function(){${await bundleHarness()}})(); "ok"`);
  const report = { tolerance: spec.tolerance, cases: [] };
  for (const c of cases) {
    const input = readSample(c.sample);
    const width = input.keypad?.model === "TSG2" ? 480 : 1024;
    const preview = PREVIEW[width];
    const frame = await evaluate(cdp, `window.__tshCompare.render(${JSON.stringify(input)}, ${c.record}, ` +
      `${preview.scale}, ${new Date(c.time).getTime()})`);
    const shotPng = await cdp.call("Page.captureScreenshot", { format: "png",
      clip: { x: frame[0], y: frame[1], width: frame[2], height: frame[3], scale: 1 } });
    const job = {
      shot: "data:image/png;base64," + fs.readFileSync(path.join(RE_TSH, "shots", c.shot)).toString("base64"),
      editor: "data:image/png;base64," + shotPng.result.data,
      origin: SHOT_ORIGIN, preview, regions: c.regions, tolerance: spec.tolerance,
      background: c.background ?? spec.background, threshold: c.threshold ?? spec.threshold
    };
    fs.writeFileSync(path.join(outDir, `${c.name}-editor.png`), Buffer.from(shotPng.result.data, "base64"));
    const r = await evaluate(cdp, `(${PAGE_COMPARE})(${JSON.stringify(job)})`);
    const png = path.join(outDir, `${c.name}.png`);
    fs.writeFileSync(png, Buffer.from(r.png.split(",")[1], "base64"));
    const passed = r.regions.filter((x) => x.ok).length;
    report.cases.push({ name: c.name, shot: c.shot, sample: c.sample, record: c.record, png, passed,
      total: r.regions.length, notVerified: c.notVerified ?? [], regions: r.regions });
    console.log(`${c.name}: ${passed}/${r.regions.length} regions within tolerance` +
      r.regions.filter((x) => !x.ok).map((x) => `\n  out: ${x.label} dLeft ${fmt(x.dLeft)} dTop ${fmt(x.dTop)} ` +
        `dW ${fmt(x.dWidth)} (${fmt(x.dWidthPct)} %) dH ${fmt(x.dHeight)} (${fmt(x.dHeightPct)} %)`).join(""));
  }
  report.passed = report.cases.reduce((n, c) => n + c.passed, 0);
  report.total = report.cases.reduce((n, c) => n + c.total, 0);
  fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
  console.log(`total: ${report.passed}/${report.total} regions within tolerance; report ${path.join(outDir, "report.json")}`);
  cdp.close();
  process.exit(report.passed === report.total ? 0 : 1);
}

// Number with one decimal, or "-" for null. Returns the text.
function fmt(n) {
  return n === null ? "-" : n.toFixed(1);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
