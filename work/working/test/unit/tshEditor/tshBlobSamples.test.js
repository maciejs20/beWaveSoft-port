// Round-trip of decodeBlob/encodeBlob (src/renderer/app/desktop/tshEditor/tshBlob.js) on all 89 TSH Soft samples,
// with tools/tsh-blob.mjs (parseBlob) as the independent oracle.
// Run: npm --prefix work/working/tools test  (from the repo root)
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { loadSamples } = require("../../support/tshSamples.js");
const { fresh001Model, screen, textWidget } = require("../../support/tshModels.js");
const { decodeBlob, encodeBlob } = require(path.join(__dirname, "../../../src/renderer/app/desktop/tshEditor/tshBlob.js"));
const { parseBlob } = require(path.join(__dirname, "../../../tools/tsh-blob.mjs"));

const samples = [...loadSamples()];
const STALE_SUM_SAMPLE = "083";

describe("TSH samples", () => {
  it("decodes all 89 samples without issues except the stale sum of 083", () => {
    assert.equal(samples.length, 89);
    for (const [id, s] of samples) {
      const codes = decodeBlob(s.bytes).issues.map((i) => i.code);
      assert.deepEqual(codes, id === STALE_SUM_SAMPLE ? ["DIR_SUM"] : [], id);
    }
  });
  it("decodes every record and widget of the samples as typed data", () => {
    const t = { records: 0, rawRecords: 0, widgets: 0, rawWidgets: 0, nullData: 0 };
    for (const [, s] of samples) {
      for (const r of decodeBlob(s.bytes).blob.records) {
        if (r.kind === "raw") { t.rawRecords++; continue; }
        t.records++;
        for (const w of r.widgets) {
          if (w.kind === "raw") { t.rawWidgets++; continue; }
          t.widgets++;
          if (w.data === null) t.nullData++;
        }
      }
    }
    assert.deepEqual(t, { records: 1135, rawRecords: 0, widgets: 1306, rawWidgets: 0, nullData: 0 });
  });
  it("re-encodes every sample to the same bytes", () => {
    for (const [id, s] of samples) {
      if (id === STALE_SUM_SAMPLE) continue;
      assert.deepEqual(encodeBlob(decodeBlob(s.bytes).blob), { ok: true, bytes: s.bytes }, id);
    }
  });
  it("fixes only the theme directory sum of sample 083", () => {
    const old = loadSamples().get(STALE_SUM_SAMPLE).bytes;
    const enc = encodeBlob(decodeBlob(old).blob);
    assert.equal(enc.ok, true);
    assert.equal(enc.bytes.length, old.length);
    const diff = [...old].map((b, i) => (b === enc.bytes[i] ? -1 : i)).filter((i) => i >= 0);
    assert.deepEqual(diff, [13, 14]);
    assert.deepEqual([enc.bytes[13], enc.bytes[14]], [0x12, 0xcb]);
    assert.deepEqual([old[13], old[14]], [0x11, 0xed]);
  });
  it("produces blobs the reference decoder accepts", () => {
    for (const [id, s] of samples) {
      const enc = encodeBlob(decodeBlob(s.bytes).blob);
      assert.equal(enc.ok, true, id);
      assert.deepEqual(parseBlob(Buffer.from(enc.bytes)).errors, [], id);
    }
  });
  it("builds a blob from scratch that both decoders accept", () => {
    const m = fresh001Model();
    m.records.push(screen({ main: true, widgets: [textWidget("Ekran ąę tekst")] }));
    const enc = encodeBlob(m);
    assert.equal(enc.ok, true);
    assert.deepEqual(decodeBlob(enc.bytes).issues, []);
    assert.deepEqual(parseBlob(Buffer.from(enc.bytes)).errors, []);
  });
  it("tsh-blob.mjs runs main when launched through a symlink", () => {
    const fs = require("node:fs");
    const os = require("node:os");
    const { spawnSync } = require("node:child_process");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tsh-link-"));
    try {
      const link = path.join(dir, "tsh-blob.mjs");
      fs.symlinkSync(path.join(__dirname, "../../../tools/tsh-blob.mjs"), link);
      const r = spawnSync(process.execPath, [link, "--self-test"], { encoding: "utf8" });
      assert.deepEqual([r.status, r.stdout.includes("self-test ok")], [0, true]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
