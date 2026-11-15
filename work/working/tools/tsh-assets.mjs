// Extracts Satel TSH Soft graphics (backgrounds, fonts, themes, icons) from TSH_soft.exe, a Delphi PE32 file.
// Pure Node, no dependencies, no wine. The resources are RT_RCDATA entries of the PE .rsrc directory.
// Library: readPeResources(buf), parseIniFile(text), extractTshAssets(exePath, outDir).
// CLI: node tsh-assets.mjs <exe> <outDir>   (exit 2 when the exe is missing, 1 on any other failure)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RT_RCDATA = 10;
const kMaxDepth = 3; // type -> name -> language

// Reads a resource directory string (UTF-16LE, 16-bit length prefix) at rsrc offset `off`.
function dirString(buf, base, off) {
  const o = base + off;
  const len = buf.readUInt16LE(o);
  return buf.toString('utf16le', o + 2, o + 2 + len * 2);
}

// Returns a Map name -> Buffer of every RT_RCDATA resource (first language of each). Throws on a malformed PE.
export function readPeResources(buf) {
  if (buf.length < 0x40 || buf.readUInt16LE(0) !== 0x5a4d) throw new Error('not a PE file (no MZ header)');
  const pe = buf.readUInt32LE(0x3c);
  if (pe + 24 > buf.length || buf.readUInt32LE(pe) !== 0x00004550) throw new Error('not a PE file (no PE signature)');
  const sections = buf.readUInt16LE(pe + 6);
  const optSize = buf.readUInt16LE(pe + 20);
  const opt = pe + 24;
  const magic = buf.readUInt16LE(opt);
  const dirOffset = magic === 0x20b ? 112 : 96; // PE32+ / PE32
  const rsrcRva = buf.readUInt32LE(opt + dirOffset + 2 * 8);
  if (!rsrcRva) throw new Error('PE file has no resource directory');
  const secTable = opt + optSize;
  const rvaToOffset = (rva) => {
    for (let i = 0; i < sections; i++) {
      const s = secTable + 40 * i;
      const va = buf.readUInt32LE(s + 12);
      const rawSize = buf.readUInt32LE(s + 16);
      const vsize = buf.readUInt32LE(s + 8);
      if (rva >= va && rva < va + Math.max(rawSize, vsize)) return rva - va + buf.readUInt32LE(s + 20);
    }
    throw new Error(`RVA 0x${rva.toString(16)} is outside every section`);
  };
  const base = rvaToOffset(rsrcRva);

  // Entries of the directory at rsrc offset `off`: [{ id | name, target, isDir }].
  const entries = (off) => {
    const o = base + off;
    const count = buf.readUInt16LE(o + 12) + buf.readUInt16LE(o + 14);
    const list = [];
    for (let i = 0; i < count; i++) {
      const e = o + 16 + 8 * i;
      const nameField = buf.readUInt32LE(e);
      const target = buf.readUInt32LE(e + 4);
      const entry = { isDir: (target & 0x80000000) !== 0, target: target & 0x7fffffff };
      if (nameField & 0x80000000) entry.name = dirString(buf, base, nameField & 0x7fffffff);
      else entry.id = nameField;
      list.push(entry);
    }
    return list;
  };
  const leaf = (off) => {
    const e = base + off;
    const size = buf.readUInt32LE(e + 4);
    const start = rvaToOffset(buf.readUInt32LE(e));
    if (start + size > buf.length) throw new Error('resource data runs past the end of the file');
    return buf.subarray(start, start + size);
  };

  const result = new Map();
  const typeEntry = entries(0).find((e) => e.id === RT_RCDATA && e.isDir);
  if (!typeEntry) return result;
  for (const nameEntry of entries(typeEntry.target)) {
    let cur = nameEntry;
    for (let depth = 2; cur.isDir && depth < kMaxDepth + 1; depth++) cur = entries(cur.target)[0];
    if (!cur || cur.isDir) continue;
    const name = nameEntry.name ?? `#${nameEntry.id}`;
    result.set(name, leaf(cur.target));
  }
  return result;
}

// Delphi colour $BBGGRR (optionally "$" / "0x" prefixed hex) -> "#rrggbb"; null when not a colour.
export function delphiColorToCss(value) {
  const m = /^(?:\$|0x)?([0-9a-f]{1,6})$/i.exec(String(value).trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const hex = (v) => v.toString(16).padStart(2, '0');
  return `#${hex(n & 0xff)}${hex((n >> 8) & 0xff)}${hex((n >> 16) & 0xff)}`;
}

// Parses INI text to { section: { key: raw } } (keys keep their case, sections keep file order).
export function parseIniFile(text) {
  const sections = {};
  let cur = null;
  for (const raw of text.replace(/^﻿/, '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line[0] === ';') continue;
    const sec = /^\[(.*)\]$/.exec(line);
    if (sec) { cur = sections[sec[1]] = sections[sec[1]] || {}; continue; }
    const eq = line.indexOf('=');
    if (eq > 0 && cur) cur[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return sections;
}

// Themes for the editor preview: every INI section becomes { name, background, colors, raw }.
// `colors` holds every value that looks like a Delphi colour in the keys cl1..cln, converted to #rrggbb.
export function buildThemes(iniText) {
  const sections = parseIniFile(iniText);
  return Object.entries(sections).map(([name, raw]) => {
    const colors = {};
    for (const [k, v] of Object.entries(raw)) {
      if (/^cl\d*$/i.test(k)) {
        const css = delphiColorToCss(v);
        if (css) colors[k.toLowerCase()] = css;
      }
    }
    return { name, background: raw.bg ?? raw.BG ?? null, colors, raw };
  });
}

// Detects a font container by magic: TTF (00010000 / true), OTF (OTTO), TTC (ttcf), WOFF, WOFF2.
export function fontExtension(buf) {
  const m = buf.toString('latin1', 0, 4);
  if (m === 'OTTO') return 'otf';
  if (m === 'ttcf') return 'ttc';
  if (m === 'wOFF') return 'woff';
  if (m === 'wOF2') return 'woff2';
  if (m === 'true' || buf.readUInt32BE(0) === 0x00010000) return 'ttf';
  return null;
}

// Extension for a picture by magic (jpg, png, bmp, gif), else null.
export function imageExtension(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 4 && buf.toString('latin1', 1, 4) === 'PNG') return 'png';
  if (buf.length > 2 && buf.toString('latin1', 0, 2) === 'BM') return 'bmp';
  if (buf.length > 3 && buf.toString('latin1', 0, 3) === 'GIF') return 'gif';
  return null;
}

// Extracts the assets to outDir (cleared first) and returns the manifest object, also written to manifest.json.
// Taken: BG_* backgrounds, fonts (any resource with a font magic: ROBL, ROBT, WDGT) and INIFILE (themes.json with
// "backgroundFile" resolved case-insensitively from the theme's bg). Not taken, only listed in manifest.resources:
// dialog button/message PNGs (BB*, MSG_*), Delphi form layouts (TFORM*, TFR_FC, TPSSFORM, TMODULVOICE), package data.
export function extractTshAssets(exePath, outDir) {
  const res = readPeResources(fs.readFileSync(exePath));
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const files = [];
  const write = (rel, data, kind, resource) => {
    const file = path.join(outDir, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, data);
    files.push({ file: rel, kind, resource, size: data.length });
  };
  const backgrounds = new Map(); // upper-case resource name -> relative file
  for (const [name, data] of res) {
    if (name === 'INIFILE') continue;
    const font = fontExtension(data);
    if (font) { write(`fonts/${name}.${font}`, data, 'font', name); continue; }
    const image = imageExtension(data);
    if (name.startsWith('BG_') && image) {
      write(`bg/${name}.${image}`, data, 'background', name);
      backgrounds.set(name.toUpperCase(), `bg/${name}.${image}`);
    }
  }
  const ini = res.get('INIFILE');
  if (ini) {
    const themes = buildThemes(ini.toString('latin1')).map((t) => ({
      ...t, backgroundFile: t.background ? backgrounds.get(t.background.toUpperCase()) ?? null : null,
    }));
    write('themes.json', JSON.stringify(themes, null, 2) + '\n', 'themes', 'INIFILE');
  }
  const manifest = { source: path.basename(exePath), resources: [...res.keys()], files };
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [exe, outDir] = process.argv.slice(2);
  if (!exe || !outDir) { console.error('usage: node tsh-assets.mjs <TSH_soft.exe> <outDir>'); process.exit(1); }
  if (!fs.existsSync(exe)) { console.error(`FAIL tsh-assets: missing ${exe}`); process.exit(2); }
  try {
    const m = extractTshAssets(exe, outDir);
    console.log(`OK tsh-assets: ${m.files.length} files in ${outDir}`);
  } catch (e) { console.error(`FAIL tsh-assets: ${e.message}`); process.exit(1); }
}
