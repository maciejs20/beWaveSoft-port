// IPC of the TSH screens editor for microSD card files (PROJEKT-TSH-EDYTOR.md "Karta microSD"): the user picks a
// folder (the card root or a folder later copied to it); the renderer may then list, write and remove only the
// card picture files photo/imgN.jpg and map/mapN.jpg under a folder picked in this session. A symbolic link in place
// of the subdirectory or of the picture file is refused, so nothing else on disk is reachable through these channels.
const fs = require("fs");
const path = require("path");

// Card subdirectories and the file names allowed in each.
const NAME_PATTERN = {
  photo: /^img[0-9]{1,4}\.jpg$/i,
  map: /^map[0-9]{1,4}\.jpg$/i
};
// Largest file the renderer may write (a 1024x600 JPEG is far below).
const MAX_FILE_BYTES = 16 * 1024 * 1024;

// Absolute path of one card file, or null when the request is not allowed: root must be a folder picked in this
// session, subdir one of NAME_PATTERN, name a file name matching its pattern (no separators, so no traversal).
// name may be omitted to get the subdirectory itself.
function resolveSdPath(roots, root, subdir, name) {
  if (typeof root !== "string" || !roots.has(root) || !Object.prototype.hasOwnProperty.call(NAME_PATTERN, subdir)) {
    return null;
  }
  if (name !== undefined && (typeof name !== "string" || !NAME_PATTERN[subdir].test(name))) {
    return null;
  }
  const dir = path.join(root, subdir);
  const target = name === undefined ? dir : path.join(dir, name);
  const rel = path.relative(root, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    return null;
  }
  return target;
}

// Throws when the card subdirectory exists but is a symbolic link or not a directory (writes must stay in root).
function checkRealDir(dir) {
  let st;
  try {
    st = fs.lstatSync(dir);
  } catch (e) {
    if (e.code === "ENOENT") return false;
    throw e;
  }
  if (st.isSymbolicLink() || !st.isDirectory()) {
    throw new Error(`${dir} is not a plain directory`);
  }
  return true;
}

// Throws when the card file exists but is a symbolic link or not a regular file (a write or remove would reach
// outside root through it). Returns whether the file exists.
function checkRealFile(file) {
  let st;
  try {
    st = fs.lstatSync(file);
  } catch (e) {
    if (e.code === "ENOENT") return false;
    throw e;
  }
  if (st.isSymbolicLink() || !st.isFile()) {
    throw new Error(`${file} is not a plain file`);
  }
  return true;
}

// Counter that makes each temporary file name unique, so a file left by a crash cannot block a later write.
let tmpCounter = 0;

// Writes bytes through a temporary file in the same directory renamed over the target: rename replaces a link put
// there after the check instead of writing into the link's target. All bytes are written (fs.writeSync may write
// fewer, e.g. on a nearly full card) and synced before the rename; on any failure the temporary file is removed and
// the old target stays intact.
function writeFileNoFollow(file, bytes) {
  const { O_WRONLY, O_CREAT, O_EXCL, O_NOFOLLOW } = fs.constants;
  let tmp;
  let fd = null;
  // A name taken by a file left from an earlier run is skipped; the attempt limit stops an endless loop.
  for (let attempt = 0; fd === null; attempt++) {
    tmp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${++tmpCounter}.tmp`);
    try {
      fd = fs.openSync(tmp, O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW, 0o644);
    } catch (e) {
      if (e.code !== "EEXIST" || attempt >= 99) throw e;
    }
  }
  try {
    let off = 0;
    while (off < bytes.length) {
      const n = fs.writeSync(fd, bytes, off, bytes.length - off);
      if (!(n > 0)) throw new Error(`short write to ${tmp}`);
      off += n;
    }
    fs.fsyncSync(fd);
    const f = fd;
    fd = null; // cleared before closing: a failed close must not close a number another file may reuse
    fs.closeSync(f);
    fs.renameSync(tmp, file);
  } catch (e) {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch {
        // The write error is the one to report.
      }
    }
    fs.rmSync(tmp, { force: true });
    throw e;
  }
}

// Registers the handlers; getWindow returns the parent window of the folder dialog.
function registerTshSdHandlers(ipcMain, dialog, getWindow) {
  const roots = new Set();
  const fail = (error) => ({ success: false, error: error.message ?? String(error) });

  // Folder dialog; the picked folder becomes writable for this session. Returns the path or null.
  ipcMain.handle("tsh-sd-choose-folder", async function () {
    const r = await dialog.showOpenDialog(getWindow(), { properties: ["openDirectory", "createDirectory"] });
    const dir = r.canceled ? null : r.filePaths[0] || null;
    if (dir) roots.add(dir);
    return dir;
  });
  // Card picture files in a subdirectory. Returns { success, names } (names [] when it does not exist).
  ipcMain.handle("tsh-sd-list", async function (event, root, subdir) {
    try {
      const dir = resolveSdPath(roots, root, subdir);
      if (!dir) throw new Error("path not allowed");
      const names = checkRealDir(dir) ? fs.readdirSync(dir).filter((n) => NAME_PATTERN[subdir].test(n)) : [];
      return { success: true, names };
    } catch (e) {
      return fail(e);
    }
  });
  // Writes one card picture; creates the subdirectory. Returns { success, filePath }.
  ipcMain.handle("tsh-sd-write", async function (event, root, subdir, name, bytes) {
    try {
      const file = resolveSdPath(roots, root, subdir, name);
      if (!file) throw new Error("path not allowed");
      if (!(bytes instanceof Uint8Array) || bytes.length === 0 || bytes.length > MAX_FILE_BYTES) {
        throw new Error("bad file data");
      }
      const dir = path.dirname(file);
      if (!checkRealDir(dir)) fs.mkdirSync(dir);
      checkRealFile(file);
      writeFileNoFollow(file, bytes);
      return { success: true, filePath: file };
    } catch (e) {
      return fail(e);
    }
  });
  // Removes one card picture (the old slideshow before a new one is written). Returns { success }.
  ipcMain.handle("tsh-sd-remove", async function (event, root, subdir, name) {
    try {
      const file = resolveSdPath(roots, root, subdir, name);
      if (!file) throw new Error("path not allowed");
      checkRealDir(path.dirname(file));
      if (checkRealFile(file)) fs.unlinkSync(file);
      return { success: true };
    } catch (e) {
      return fail(e);
    }
  });
}

module.exports = { registerTshSdHandlers, resolveSdPath, NAME_PATTERN, MAX_FILE_BYTES };
