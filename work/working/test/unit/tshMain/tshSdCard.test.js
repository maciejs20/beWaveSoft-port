// Tests of the main process microSD IPC (src/main/tshSdCard.js): only card pictures under a folder picked in this
// session can be listed, written and removed; other roots, other names, traversal, symlinked subfolders and symlinked
// picture files fail; a short, failing or unsynced write leaves the old picture and no temporary file.
// Run: npm --prefix work/working/tools test  (from the repo root)
"use strict";
const { describe, it, beforeEach, afterEach, mock } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { registerTshSdHandlers, resolveSdPath } = require("../../../src/main/tshSdCard.js");

// Registers the handlers on a fake ipcMain with a dialog that returns the given folders in turn.
// Returns { invoke(channel, ...args) }.
function setup(folders) {
  const handlers = new Map();
  const ipcMain = { handle: (channel, fn) => handlers.set(channel, fn) };
  const dialog = { showOpenDialog: async () => {
    const dir = folders.shift();
    return dir ? { canceled: false, filePaths: [dir] } : { canceled: true, filePaths: [] };
  } };
  registerTshSdHandlers(ipcMain, dialog, () => null);
  return { invoke: (channel, ...args) => handlers.get(channel)({}, ...args) };
}

describe("resolveSdPath", () => {
  const roots = new Set(["/media/card"]);
  it("allows card pictures in photo and map of a picked folder", () => {
    assert.equal(resolveSdPath(roots, "/media/card", "photo", "img1.jpg"), path.join("/media/card", "photo", "img1.jpg"));
    assert.equal(resolveSdPath(roots, "/media/card", "map", "MAP12.JPG"), path.join("/media/card", "map", "MAP12.JPG"));
    assert.equal(resolveSdPath(roots, "/media/card", "photo"), path.join("/media/card", "photo"));
  });
  it("refuses other roots, subfolders, names and traversal", () => {
    assert.equal(resolveSdPath(roots, "/media/other", "photo", "img1.jpg"), null);
    assert.equal(resolveSdPath(roots, "/media/card/..", "photo", "img1.jpg"), null);
    assert.equal(resolveSdPath(roots, "/media/card", "sounds", "img1.jpg"), null);
    assert.equal(resolveSdPath(roots, "/media/card", "..", "img1.jpg"), null);
    assert.equal(resolveSdPath(roots, "/media/card", "photo", "map1.jpg"), null);
    assert.equal(resolveSdPath(roots, "/media/card", "photo", "../img1.jpg"), null);
    assert.equal(resolveSdPath(roots, "/media/card", "photo", "img1.jpg/../../x"), null);
    assert.equal(resolveSdPath(roots, "/media/card", "photo", "img1.png"), null);
    assert.equal(resolveSdPath(roots, "/media/card", "photo", 1), null);
    assert.equal(resolveSdPath(roots, "/media/card", "toString", undefined), null);
  });
});

describe("tsh-sd IPC handlers", () => {
  let tmp;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tsh-sd-"));
  });
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });
  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]);

  it("writes, lists and removes pictures only after the folder was picked", async () => {
    const card = path.join(tmp, "card");
    fs.mkdirSync(card);
    const ipc = setup([card]);
    assert.equal((await ipc.invoke("tsh-sd-write", card, "photo", "img1.jpg", jpeg)).success, false);
    assert.equal(await ipc.invoke("tsh-sd-choose-folder"), card);
    const w = await ipc.invoke("tsh-sd-write", card, "photo", "img1.jpg", jpeg);
    assert.deepEqual(w, { success: true, filePath: path.join(card, "photo", "img1.jpg") });
    assert.deepEqual(fs.readFileSync(w.filePath), Buffer.from(jpeg));
    assert.equal((await ipc.invoke("tsh-sd-write", card, "map", "map2.jpg", jpeg)).success, true);
    fs.writeFileSync(path.join(card, "photo", "notes.txt"), "x");
    assert.deepEqual(await ipc.invoke("tsh-sd-list", card, "photo"), { success: true, names: ["img1.jpg"] });
    assert.deepEqual(await ipc.invoke("tsh-sd-list", card, "map"), { success: true, names: ["map2.jpg"] });
    assert.deepEqual(await ipc.invoke("tsh-sd-remove", card, "photo", "img1.jpg"), { success: true });
    assert.equal(fs.existsSync(w.filePath), false);
    assert.equal(fs.existsSync(path.join(card, "photo", "notes.txt")), true);
  });
  it("lists nothing when the subfolder does not exist, and a cancelled dialog picks nothing", async () => {
    const ipc = setup([tmp]);
    await ipc.invoke("tsh-sd-choose-folder");
    assert.deepEqual(await ipc.invoke("tsh-sd-list", tmp, "photo"), { success: true, names: [] });
    assert.equal(await ipc.invoke("tsh-sd-choose-folder"), null);
  });
  it("refuses bad names, empty data and a symlinked subfolder", async () => {
    const outside = path.join(tmp, "outside");
    const card = path.join(tmp, "card");
    fs.mkdirSync(outside);
    fs.mkdirSync(card);
    fs.symlinkSync(outside, path.join(card, "map"));
    const ipc = setup([card]);
    await ipc.invoke("tsh-sd-choose-folder");
    assert.equal((await ipc.invoke("tsh-sd-write", card, "photo", "../img1.jpg", jpeg)).success, false);
    assert.equal((await ipc.invoke("tsh-sd-write", card, "photo", "img1.jpg", new Uint8Array(0))).success, false);
    assert.equal((await ipc.invoke("tsh-sd-write", card, "photo", "img1.jpg", "text")).success, false);
    assert.equal((await ipc.invoke("tsh-sd-write", card, "map", "map1.jpg", jpeg)).success, false);
    assert.deepEqual(fs.readdirSync(outside), []);
    assert.equal((await ipc.invoke("tsh-sd-list", card, "map")).success, false);
  });
  it("refuses a symlinked picture file pointing outside the folder (write and remove)", async () => {
    const outside = path.join(tmp, "outside");
    const card = path.join(tmp, "card");
    fs.mkdirSync(outside);
    fs.mkdirSync(path.join(card, "photo"), { recursive: true });
    const victim = path.join(outside, "victim.txt");
    fs.writeFileSync(victim, "keep");
    fs.symlinkSync(path.join("..", "..", "outside", "victim.txt"), path.join(card, "photo", "img1.jpg"));
    const ipc = setup([card]);
    await ipc.invoke("tsh-sd-choose-folder");
    assert.equal((await ipc.invoke("tsh-sd-write", card, "photo", "img1.jpg", jpeg)).success, false);
    assert.equal((await ipc.invoke("tsh-sd-remove", card, "photo", "img1.jpg")).success, false);
    assert.equal(fs.readFileSync(victim, "utf8"), "keep");
    assert.equal(fs.lstatSync(path.join(card, "photo", "img1.jpg")).isSymbolicLink(), true);
    assert.deepEqual(fs.readdirSync(path.join(card, "photo")), ["img1.jpg"]);
  });
  it("overwrites an existing plain picture without leaving temporary files", async () => {
    const card = path.join(tmp, "card");
    fs.mkdirSync(path.join(card, "photo"), { recursive: true });
    fs.writeFileSync(path.join(card, "photo", "img1.jpg"), "old");
    const ipc = setup([card]);
    await ipc.invoke("tsh-sd-choose-folder");
    assert.equal((await ipc.invoke("tsh-sd-write", card, "photo", "img1.jpg", jpeg)).success, true);
    assert.deepEqual(fs.readFileSync(path.join(card, "photo", "img1.jpg")), Buffer.from(jpeg));
    assert.deepEqual(fs.readdirSync(path.join(card, "photo")), ["img1.jpg"]);
  });

  describe("write errors", () => {
    let card;
    let photo;
    let ipc;
    beforeEach(async () => {
      card = path.join(tmp, "card");
      photo = path.join(card, "photo");
      fs.mkdirSync(photo, { recursive: true });
      fs.writeFileSync(path.join(photo, "img1.jpg"), "old");
      ipc = setup([card]);
      await ipc.invoke("tsh-sd-choose-folder");
    });
    afterEach(() => mock.restoreAll());
    const big = Uint8Array.from({ length: 1000 }, (_, i) => i & 0xff);
    const old = () => fs.readFileSync(path.join(photo, "img1.jpg"), "utf8");

    it("continues after short writes until all bytes are on disk", async () => {
      const writeSync = fs.writeSync;
      // Each call writes at most 7 bytes, as write(2) may on a nearly full card.
      mock.method(fs, "writeSync", (fd, buf, off, len) => writeSync(fd, buf, off, Math.min(len, 7)));
      assert.equal((await ipc.invoke("tsh-sd-write", card, "photo", "img1.jpg", big)).success, true);
      assert.deepEqual(fs.readFileSync(path.join(photo, "img1.jpg")), Buffer.from(big));
      assert.deepEqual(fs.readdirSync(photo), ["img1.jpg"]);
    });
    it("fails a write that stops short, keeping the old picture", async () => {
      const writeSync = fs.writeSync;
      let calls = 0;
      // First call writes part of the data, the next one nothing (no error, as at a size limit).
      mock.method(fs, "writeSync", (fd, buf, off, len) => (calls++ ? 0 : writeSync(fd, buf, off, len >> 1)));
      const r = await ipc.invoke("tsh-sd-write", card, "photo", "img1.jpg", big);
      assert.equal(r.success, false);
      assert.match(r.error, /short write/);
      assert.equal(old(), "old");
      assert.deepEqual(fs.readdirSync(photo), ["img1.jpg"]);
    });
    it("removes the temporary file after a write or sync error, and a retry succeeds", async () => {
      const enospc = () => Object.assign(new Error("ENOSPC: no space left on device, write"), { code: "ENOSPC" });
      mock.method(fs, "writeSync", () => {
        throw enospc();
      });
      const r = await ipc.invoke("tsh-sd-write", card, "photo", "img1.jpg", big);
      assert.deepEqual(r, { success: false, error: "ENOSPC: no space left on device, write" });
      assert.equal(old(), "old");
      assert.deepEqual(fs.readdirSync(photo), ["img1.jpg"]);
      mock.restoreAll();
      mock.method(fs, "fsyncSync", () => {
        throw enospc();
      });
      assert.equal((await ipc.invoke("tsh-sd-write", card, "photo", "img1.jpg", big)).success, false);
      assert.equal(old(), "old");
      assert.deepEqual(fs.readdirSync(photo), ["img1.jpg"]);
      mock.restoreAll();
      assert.equal((await ipc.invoke("tsh-sd-write", card, "photo", "img1.jpg", big)).success, true);
      assert.deepEqual(fs.readFileSync(path.join(photo, "img1.jpg")), Buffer.from(big));
      assert.deepEqual(fs.readdirSync(photo), ["img1.jpg"]);
    });
    it("is not blocked by a temporary file left by an earlier run", async () => {
      fs.writeFileSync(path.join(photo, `.img1.jpg.${process.pid}.tmp`), "left");
      fs.writeFileSync(path.join(photo, `.img1.jpg.${process.pid}.1.tmp`), "left");
      assert.equal((await ipc.invoke("tsh-sd-write", card, "photo", "img1.jpg", big)).success, true);
      assert.deepEqual(fs.readFileSync(path.join(photo, "img1.jpg")), Buffer.from(big));
    });
  });
});
