// Tests of tools/tsh-assets.mjs: PE resource reader on a synthetic PE, INI/theme conversion, real TSH_soft.exe.
// Run: npm --prefix work/working/tools test  (from the repo root)
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const load = () => import(path.join(__dirname, "../../../tools/tsh-assets.mjs"));

// Minimal PE32 with one .rsrc section. Resource tree: root { RT_BITMAP(2) -> empty dir, RT_RCDATA(10) -> name dir
// { named entry -> language dir { 0x409 -> leaf } } }; the reader must ignore RT_BITMAP.
function buildPe(resources) {
  const names = Object.keys(resources);
  const n = names.length;
  const rsrcVa = 0x1000, rawOff = 0x200;
  const dir = (count) => 16 + 8 * count;
  const bmpOff = dir(2), nameOff = bmpOff + dir(0);
  const langOff = (i) => nameOff + dir(n) + i * dir(1);
  const leafOff = (i) => nameOff + dir(n) + n * dir(1) + 16 * i;
  const strOff = (i) => nameOff + dir(n) + n * dir(1) + 16 * n + i * 64;
  const dataOff = (i) => strOff(n) + i * 4096;
  const rsrc = Buffer.alloc(dataOff(n));
  rsrc.writeUInt16LE(2, 14);
  rsrc.writeUInt32LE(2, 16); rsrc.writeUInt32LE(((0x80000000 | bmpOff) >>> 0), 20);
  rsrc.writeUInt32LE(10, 24); rsrc.writeUInt32LE(((0x80000000 | nameOff) >>> 0), 28);
  rsrc.writeUInt16LE(n, nameOff + 12);
  names.forEach((name, i) => {
    const e = nameOff + 16 + 8 * i;
    rsrc.writeUInt32LE(((0x80000000 | strOff(i)) >>> 0), e);
    rsrc.writeUInt32LE(((0x80000000 | langOff(i)) >>> 0), e + 4);
    rsrc.writeUInt16LE(1, langOff(i) + 14);
    rsrc.writeUInt32LE(0x409, langOff(i) + 16);
    rsrc.writeUInt32LE(leafOff(i), langOff(i) + 20);
    rsrc.writeUInt16LE(name.length, strOff(i));
    rsrc.write(name, strOff(i) + 2, "utf16le");
    rsrc.writeUInt32LE(rsrcVa + dataOff(i), leafOff(i));
    rsrc.writeUInt32LE(resources[name].length, leafOff(i) + 4);
    resources[name].copy(rsrc, dataOff(i));
  });
  const pe = 0x80, opt = pe + 24, optSize = 224, sec = opt + optSize;
  const file = Buffer.alloc(rawOff + rsrc.length);
  file.writeUInt16LE(0x5a4d, 0); file.writeUInt32LE(pe, 0x3c);
  file.writeUInt32LE(0x4550, pe); file.writeUInt16LE(1, pe + 6); file.writeUInt16LE(optSize, pe + 20);
  file.writeUInt16LE(0x10b, opt);
  file.writeUInt32LE(rsrcVa, opt + 96 + 2 * 8); file.writeUInt32LE(rsrc.length, opt + 96 + 2 * 8 + 4);
  file.write(".rsrc", sec);
  file.writeUInt32LE(rsrc.length, sec + 8); file.writeUInt32LE(rsrcVa, sec + 12);
  file.writeUInt32LE(rsrc.length, sec + 16); file.writeUInt32LE(rawOff, sec + 20);
  rsrc.copy(file, rawOff);
  return file;
}

const TTF = Buffer.from([0, 1, 0, 0, 9, 9, 9, 9]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const INI = "[Abstract]\r\ncl3=$E6E6E6\r\ncl1=$5F5A5A\r\ncl2=$DEA856\r\nbg=bg_Abstract\r\n\r\n[black]\r\ncl3=$000000\r\ncl1=$9D9D9D\r\ncl2=$FFFFFF\r\n";

describe("readPeResources", () => {
  it("reads RT_RCDATA entries by name and ignores other resource types", async () => {
    const { readPeResources } = await load();
    const res = readPeResources(buildPe({ ROBL: TTF, BG_X: JPG, INIFILE: Buffer.from(INI) }));
    assert.deepEqual([...res.keys()].sort(), ["BG_X", "INIFILE", "ROBL"]);
    assert.deepEqual(res.get("ROBL"), TTF);
    assert.deepEqual(res.get("BG_X"), JPG);
    assert.equal(res.get("INIFILE").toString(), INI);
  });
  it("rejects a file that is not a PE", async () => {
    const { readPeResources } = await load();
    assert.throws(() => readPeResources(Buffer.alloc(100)), /not a PE/);
    const bad = buildPe({ A: TTF }); bad.writeUInt32LE(0, 0x80);
    assert.throws(() => readPeResources(bad), /PE signature/);
  });
});

describe("themes", () => {
  it("converts Delphi $BBGGRR to #rrggbb", async () => {
    const { delphiColorToCss } = await load();
    assert.equal(delphiColorToCss("$DEA856"), "#56a8de");
    assert.equal(delphiColorToCss("$0000FF"), "#ff0000");
    assert.equal(delphiColorToCss("$00BBFF"), "#ffbb00");
    assert.equal(delphiColorToCss("bg_Abstract"), null);
  });
  it("builds themes keeping raw values", async () => {
    const { buildThemes } = await load();
    const t = buildThemes(INI);
    assert.equal(t.length, 2);
    assert.deepEqual(t[0].colors, { cl3: "#e6e6e6", cl1: "#5a5a5f", cl2: "#56a8de" });
    assert.equal(t[0].background, "bg_Abstract");
    assert.equal(t[0].raw.cl2, "$DEA856");
    assert.equal(t[1].background, null);
  });
});

describe("extractTshAssets", () => {
  it("writes fonts, backgrounds, themes with backgroundFile and a manifest from a synthetic exe", async () => {
    const { extractTshAssets } = await load();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tshassets-"));
    try {
      const exe = path.join(dir, "t.exe");
      fs.writeFileSync(exe, buildPe({ ROBL: TTF, BG_ABSTRACT: JPG, INIFILE: Buffer.from(INI), TFORM1: Buffer.from("TPF0") }));
      const out = path.join(dir, "out");
      const m = extractTshAssets(exe, out);
      assert.deepEqual(m.files.map((f) => f.file).sort(), ["bg/BG_ABSTRACT.jpg", "fonts/ROBL.ttf", "themes.json"]);
      assert.deepEqual(fs.readFileSync(path.join(out, "fonts/ROBL.ttf")), TTF);
      const themes = JSON.parse(fs.readFileSync(path.join(out, "themes.json"), "utf8"));
      assert.equal(themes[0].backgroundFile, "bg/BG_ABSTRACT.jpg");
      assert.equal(themes[1].backgroundFile, null);
      assert.ok(fs.existsSync(path.join(out, "manifest.json")));
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
});

describe("real TSH_soft.exe", () => {
  const resources = path.join(__dirname, "../../../../original/1.2.0/win-build/BE WAVE Soft/resources");
  const v = fs.existsSync(resources) ? fs.readdirSync(resources).find((d) => /^v/.test(d)) : null;
  const exe = v && path.join(resources, v, "TSH_soft.exe");
  it("has the expected resources with the expected magic bytes", { skip: !exe || !fs.existsSync(exe) }, async () => {
    const { readPeResources, buildThemes } = await load();
    const res = readPeResources(fs.readFileSync(exe));
    const bg = [...res.keys()].filter((k) => k.startsWith("BG_"));
    assert.equal(bg.length, 12);
    for (const k of bg) assert.deepEqual([...res.get(k).subarray(0, 3)], [0xff, 0xd8, 0xff], k);
    for (const k of ["ROBL", "ROBT", "WDGT"]) assert.equal(res.get(k).readUInt32BE(0), 0x00010000, k);
    const themes = buildThemes(res.get("INIFILE").toString("latin1"));
    assert.equal(themes.length, 24);
    assert.deepEqual(themes.find((t) => t.name === "Abstract").colors.cl2, "#56a8de");
    for (const t of themes) if (t.background) assert.ok(res.has(t.background.toUpperCase()), t.name);
  });
});
