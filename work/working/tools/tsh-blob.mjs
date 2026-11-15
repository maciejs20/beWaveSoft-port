#!/usr/bin/env node
// Decodes and verifies the TSH Soft screens blob (screens_config_base64) from a tsh-settings.json file.
// Format and checksum: PROJEKT-TSH.md. Checksum taken from TSH_soft.exe v1.00.005 (FUN_00a9b64c, FUN_00a9b604).
// Usage: node tsh-blob.mjs <tsh-settings.json> [--hex]
//        node tsh-blob.mjs --self-test
// Exit codes: 0 all checksums valid, 1 checksum or structure error, 2 usage error, 3 file has no blob.
import fs from "node:fs";
import { pathToFileURL } from "node:url";

const kHeaderSize = 0x160;
const kDirEntrySize = 9;
const kDirOffset = 6;
const kChecksumInit = 0x13;
const kScreenTypes = { 0: "THEME", 1: "SCREENSAVER", 2: "USER_SCREEN", 4: "ADDITIONAL_SCREEN" };
const kResolutions = ["1024x600", "480x272"];
const kMaxDirEntries = 38;
const kMinHeaderLen = 22;
const kMinWidgetLen = 16;
const kPadBlock = 32;
const kPadByte = 0xab;

// One-byte checksum over d[0..d[1]] (d[1] is the low byte of the u16 length); stored at d[d[1] + 1].
export function tshChecksum(d) {
  let a = kChecksumInit;
  for (let i = 0; i <= d[1]; i++) {
    const x = (d[i] + a) & 0xff;
    a = ((x << 1) & 0xff) | (x >> 7);
  }
  return a;
}

// Big-endian u16 at offset o.
function u16(b, o) {
  return (b[o] << 8) | b[o + 1];
}

// Parses the blob into directory entries, screen headers and widgets; collects structure and checksum errors.
export function parseBlob(b) {
  const errors = [];
  if (b.length < kHeaderSize) return { out: { screens: [] }, errors: ["blob shorter than the global header"] };
  const out = { version: b[0], width: u16(b, 1), height: u16(b, 3), screens: [] };
  if (b[0] !== 1) errors.push(`unknown version ${b[0]}`);
  if (!kResolutions.includes(`${out.width}x${out.height}`)) errors.push(`unknown resolution ${out.width}x${out.height}`);
  if (b[5] > kMaxDirEntries) errors.push(`${b[5]} directory entries, at most ${kMaxDirEntries} fit`);
  let next = kHeaderSize;
  for (let i = 0; i < Math.min(b[5], kMaxDirEntries); i++) {
    const p = kDirOffset + kDirEntrySize * i;
    const id = b[p];
    const off = u16(b, p + 1);
    const len = u16(b, p + 3);
    const sum = b.readUInt32BE(p + 5);
    if (off !== next) errors.push(`screen ${id}: record at ${off}, expected contiguous at ${next}`);
    if (len < kMinHeaderLen || off + len > b.length) {
      errors.push(`screen ${id}: record ${off}+${len} out of range`);
      break;
    }
    next = off + len;
    const rec = b.subarray(off, off + len);
    let real = 0;
    for (const x of rec) real += x;
    if (real !== sum) errors.push(`screen ${id}: directory sum ${sum} != ${real}`);
    const hl = u16(rec, 0);
    if (rec[0] !== 0) {
      errors.push(`screen ${id}: header length ${hl} >= 256 is not supported`);
      continue;
    }
    if (hl + 2 > len) {
      errors.push(`screen ${id}: header length ${hl} beyond record`);
      continue;
    }
    const head = rec.subarray(0, hl + 2);
    if (tshChecksum(head) !== head[hl + 1]) errors.push(`screen ${id}: header checksum`);
    const nameLen = rec[19];
    const imageLen = rec[21 + nameLen];
    if (22 + nameLen + imageLen !== hl + 1) errors.push(`screen ${id}: name/image lengths do not fill the header`);
    if (rec[20 + nameLen] !== id) errors.push(`screen ${id}: record id ${rec[20 + nameLen]} differs from directory`);
    const screen = {
      id, off, len,
      type: kScreenTypes[rec[17] === 3 ? 2 : rec[17]] ?? rec[17],
      main: rec[17] === 3,
      useTheme: !!(rec[7] & 0x80),
      grid: !!(rec[7] & 0x10),
      saverOptions: rec[18],
      name: rec.subarray(20, 20 + nameLen).toString("utf8"),
      image: rec.subarray(22 + nameLen, 22 + nameLen + imageLen).toString("utf8").trim(),
      colors: [rec.subarray(8, 11), rec.subarray(11, 14), rec.subarray(14, 17)].map((c) => c.toString("hex")),
      widgets: []
    };
    let w = hl + 2;
    while (w < len) {
      const wl = u16(rec, w);
      const d = rec.subarray(w, w + wl + 2);
      if (rec[w] !== 0) {
        errors.push(`screen ${id}: widget length ${wl} >= 256 at ${w} is not supported`);
        break;
      }
      if (wl < kMinWidgetLen || d.length < wl + 2) {
        errors.push(`screen ${id}: bad widget length ${wl} at ${w}`);
        break;
      }
      if (tshChecksum(d) !== d[wl + 1]) errors.push(`screen ${id}: widget checksum at ${w}`);
      screen.widgets.push({
        x: u16(d, 2), y: u16(d, 4), type: d[6].toString(16).padStart(2, "0"),
        useTheme: !!(d[7] & 0x80), center: !!(d[7] & 0x08), size: d[7] & 0x03,
        colors: [d.subarray(8, 11), d.subarray(11, 14), d.subarray(14, 17)].map((c) => c.toString("hex")),
        payload: d.subarray(17, wl + 1).toString("hex")
      });
      w += wl + 2;
    }
    out.screens.push(screen);
  }
  const pad = b.subarray(next);
  if (b.length % kPadBlock !== 0 || pad.length >= kPadBlock || pad.some((x) => x !== kPadByte)) {
    errors.push(`padding: ${pad.length} bytes after records, total ${b.length}; expected 0-31 bytes of 0xab to a multiple of 32`);
  }
  return { out, errors };
}

// Checks the checksum against widgets copied from samples made by TSH Soft.
function selfTest() {
  const vectors = [
    "0023012c00c800805a5a5f56a8dee6e6e6124e6f776520706f6c652074656b73746f776507",
    "0012012c00c801805a5a5f56a8dee6e6e600002b",
    "0011012c00c823805a5a5f56a8dee6e6e600c5"
  ];
  const bad = vectors.filter((h) => {
    const d = Buffer.from(h, "hex");
    return tshChecksum(d) !== d[d[1] + 1];
  });
  console.log(bad.length ? `self-test FAILED: ${bad.length}` : "self-test ok");
  return bad.length ? 1 : 0;
}

function main(argv) {
  if (argv[0] === "--self-test") return selfTest();
  if (!argv[0] || argv[0].startsWith("--")) {
    console.error("Usage: node tsh-blob.mjs <tsh-settings.json> [--hex] | --self-test");
    return 2;
  }
  const json = JSON.parse(fs.readFileSync(argv[0], "utf8").replace(/^﻿/, ""));
  if (!json.screens_config_base64) {
    console.error("no screens_config_base64 in the file (input before the first TSH save)");
    return 3;
  }
  const blob = Buffer.from(json.screens_config_base64, "base64");
  const { out, errors } = parseBlob(blob);
  for (const s of out.screens) {
    if (!argv.includes("--hex")) for (const w of s.widgets) delete w.payload;
  }
  console.log(JSON.stringify(out, null, 1));
  for (const e of errors) console.error("ERROR", e);
  console.error(`${out.screens.length} screens, ${errors.length} errors`);
  return errors.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}
