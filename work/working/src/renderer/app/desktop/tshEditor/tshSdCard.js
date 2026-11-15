// microSD card files of the TSH screens editor (PROJEKT-TSH.md 2.5, PROJEKT-TSH-EDYTOR.md "Karta microSD"): the
// slideshow pictures photo/imgN.jpg (TSH TFormSD) and the screen backgrounds map/mapN.jpg cut out with the crop
// rectangle (TSH TFORMPICT). Pure geometry and names; tshImage.js draws on canvas, the main process writes files.
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.cropResize = exports.cropMove = exports.cropHit = exports.cropInit = exports.isCustomBackground =
  exports.backgroundName = exports.photoNames = exports.stripJpegMetadata = exports.slideRect = exports.JPEG_QUALITY =
  exports.SD_DIR = undefined;
// Card directories (TSH_soft.exe BB_Save2SDClick: "photo\", "map\"; chime\ and sounds\ are not made here).
var SD_DIR = exports.SD_DIR = {
  photo: "photo",
  map: "map"
};
// JPEG quality: TSH saves through TJPEGImage with its default 90; img1.jpg has the IJG quality 90 tables.
exports.JPEG_QUALITY = 0.9;
// Width of the resize handle at the bottom-right corner of the crop rectangle, in screen px (TSH: 10 inside, 5 out).
var HANDLE_INSIDE = 10;
var HANDLE_OUTSIDE = 5;
// Place of a slideshow picture on the keypad screen, as TSH draws it (FUN_00ab0e98 called with fitHeight false):
// a picture wider than the screen is scaled down to the screen width keeping its proportions, a smaller one is
// not enlarged; it is centered and what sticks out at the top and bottom is cut off; the rest stays black.
// Sizes and offsets are truncated like Delphi div. Returns { x, y, width, height } in screen px.
exports.slideRect = function (srcWidth, srcHeight, width, height) {
  var w = srcWidth;
  var h = srcHeight;
  if (width < w) {
    h = Math.trunc(srcHeight * width / srcWidth);
    w = width;
  }
  return {
    x: Math.trunc((width - w) / 2) || 0,
    y: Math.trunc((height - h) / 2) || 0,
    width: w,
    height: h
  };
};
// JPEG without the APP1-APP15 segments before the image data (Chromium adds an APP2 sRGB profile; TSH files have
// only APP0 JFIF, as the keypad got them so far). Bytes that do not parse as JPEG markers are returned unchanged.
// Returns a Uint8Array.
exports.stripJpegMetadata = function (bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return bytes;
  }
  var parts = [bytes.subarray(0, 2)];
  var p = 2;
  while (p + 4 <= bytes.length && bytes[p] === 0xff) {
    var marker = bytes[p + 1];
    if (marker === 0xda) {
      break;
    }
    var end = p + 2 + (bytes[p + 2] << 8 | bytes[p + 3]);
    if (end > bytes.length) {
      return bytes;
    }
    if (marker < 0xe1 || marker > 0xef) {
      parts.push(bytes.subarray(p, end));
    }
    p = end;
  }
  parts.push(bytes.subarray(p));
  var out = new Uint8Array(parts.reduce(function (n, part) {
    return n + part.length;
  }, 0));
  var at = 0;
  parts.forEach(function (part) {
    out.set(part, at);
    at += part.length;
  });
  return out;
};
// Names for count new slideshow pictures next to the files already in photo/: TSH counts from img1.jpg and skips
// names that exist (compared without case, the card is FAT). Returns ["img1.jpg", ...].
exports.photoNames = function (existing, count) {
  var taken = new Set((existing ?? []).map(function (n) {
    return String(n).toLowerCase();
  }));
  var names = [];
  var n = 1;
  while (names.length < count) {
    var name = "img" + n + ".jpg";
    if (!taken.has(name)) {
      names.push(name);
    }
    n++;
  }
  return names;
};
// File name of a custom screen background: "map" + screen id + ".jpg" (TSH_soft.exe builds "map" + number + ".jpg";
// Satel's sample has additional screens 2-5 with map2.jpg-map5.jpg). When another screen already uses that name,
// the lowest free number. used: image names of the other screens. Returns the name.
exports.backgroundName = function (id, used) {
  var taken = new Set((used ?? []).map(function (n) {
    return String(n).toLowerCase();
  }));
  var name = "map" + id + ".jpg";
  for (var n = 1; taken.has(name.toLowerCase()); n++) {
    name = "map" + n + ".jpg";
  }
  return name;
};
// True when a screen image names a file on the card: not empty and not a built-in "int://" picture.
exports.isCustomBackground = function (image) {
  var s = String(image ?? "").trim();
  return s !== "" && !/^int:\/\//i.test(s);
};
// Starting crop rectangle: the largest one with the keypad proportions, centered on the picture. Returns
// { x, y, width, height } in picture px.
exports.cropInit = function (srcWidth, srcHeight, width, height) {
  var w = srcWidth;
  var h = Math.round(srcWidth * height / width);
  if (h > srcHeight) {
    h = srcHeight;
    w = Math.min(srcWidth, Math.round(srcHeight * width / height));
  }
  return {
    x: Math.trunc((srcWidth - w) / 2),
    y: Math.trunc((srcHeight - h) / 2),
    width: w,
    height: h
  };
};
// What a press at picture point px, py does with the rectangle: "resize" on the bottom-right corner handle, "move"
// inside, null outside. scale: screen px per picture px of the shown picture. Returns the mode or null.
exports.cropHit = function (rect, px, py, scale) {
  var inside = HANDLE_INSIDE / scale;
  var outside = HANDLE_OUTSIDE / scale;
  var right = rect.x + rect.width;
  var bottom = rect.y + rect.height;
  if (px > right - inside && px <= right + outside && py > bottom - inside && py <= bottom + outside) {
    return "resize";
  }
  return px >= rect.x && px <= right && py >= rect.y && py <= bottom ? "move" : null;
};
// Rectangle moved by dx, dy picture px and kept on the picture. Returns the new rectangle.
exports.cropMove = function (rect, dx, dy, srcWidth, srcHeight) {
  return Object.assign({}, rect, {
    x: Math.round(Math.min(Math.max(rect.x + dx, 0), srcWidth - rect.width)),
    y: Math.round(Math.min(Math.max(rect.y + dy, 0), srcHeight - rect.height))
  });
};
// Rectangle resized from its bottom-right corner by a drag of dx, dy picture px, keeping the keypad proportions
// width:height as TSH does: the larger of the two moves decides. It stays on the picture and is at least a third of
// the picture height high (TSH) or the whole picture when that is smaller. Returns the new rectangle.
exports.cropResize = function (rect, dx, dy, srcWidth, srcHeight, width, height) {
  var ratio = width / height;
  var w = Math.abs(dy) < Math.abs(dx) ? rect.width + dx : (rect.height + dy) * ratio;
  var minH = Math.min(srcHeight / 3, srcWidth / ratio);
  var maxW = Math.min(srcWidth - rect.x, (srcHeight - rect.y) * ratio);
  w = Math.min(Math.max(w, minH * ratio), maxW);
  return Object.assign({}, rect, {
    width: Math.round(w),
    height: Math.min(Math.round(w / ratio), srcHeight - rect.y)
  });
};
