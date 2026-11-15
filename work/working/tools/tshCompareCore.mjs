// Pure helpers of the TSH preview comparison (tsh-preview-compare.mjs): the ink bounding box of a region of an RGBA
// image and the tolerance check of two boxes in keypad pixels. Every function is self-contained (no outer names),
// because the tool also runs their source text in the renderer page, next to the canvas pixels.

// Bounding box of the ink in a region of an RGBA image. A pixel is ink when one of its channels differs from the
// background color by at least the threshold (anti-aliased edges count from that level on).
//   rgba        Uint8ClampedArray or array, 4 bytes per pixel, row by row
//   width, height  image size in pixels
//   region      { left, top, width, height } in image pixels; parts outside the image are ignored
//   background  { color: [r, g, b], threshold }
// Returns { left, top, right, bottom } (inclusive pixel indexes) or null when the region has no ink.
export function inkBox(rgba, width, height, region, background) {
  var x0 = Math.max(0, Math.floor(region.left));
  var y0 = Math.max(0, Math.floor(region.top));
  var x1 = Math.min(width, Math.ceil(region.left + region.width));
  var y1 = Math.min(height, Math.ceil(region.top + region.height));
  var c = background.color;
  var box = null;
  for (var y = y0; y < y1; y++) {
    for (var x = x0; x < x1; x++) {
      var i = (y * width + x) * 4;
      var d = Math.max(Math.abs(rgba[i] - c[0]), Math.abs(rgba[i + 1] - c[1]), Math.abs(rgba[i + 2] - c[2]));
      if (d < background.threshold) {
        continue;
      }
      if (box === null) {
        box = { left: x, top: y, right: x, bottom: y };
      } else {
        box.left = Math.min(box.left, x);
        box.right = Math.max(box.right, x);
        box.top = Math.min(box.top, y);
        box.bottom = Math.max(box.bottom, y);
      }
    }
  }
  return box;
}

// Compares the ink box of the editor with the one of TSH Soft, both { left, top, width, height } in keypad pixels or
// null (no ink). Edges must agree within tolerance.edge pixels; a size within tolerance.sizePct percent or within
// tolerance.edge pixels passes (a percentage of a 10 px glyph is below one pixel). No ink on both sides passes, ink
// on one side only fails.
// Returns { ok, dLeft, dTop, dWidth, dHeight, dWidthPct, dHeightPct } (editor minus TSH; null without both boxes).
export function compareRegion(tsh, editor, tolerance) {
  if (!tsh || !editor) {
    return { ok: !tsh && !editor, dLeft: null, dTop: null, dWidth: null, dHeight: null, dWidthPct: null,
      dHeightPct: null };
  }
  var dLeft = editor.left - tsh.left;
  var dTop = editor.top - tsh.top;
  var dWidth = editor.width - tsh.width;
  var dHeight = editor.height - tsh.height;
  var dWidthPct = tsh.width > 0 ? dWidth / tsh.width * 100 : 0;
  var dHeightPct = tsh.height > 0 ? dHeight / tsh.height * 100 : 0;
  var sizeOk = function (d, pct) {
    return Math.abs(d) <= tolerance.edge || Math.abs(pct) <= tolerance.sizePct;
  };
  return {
    ok: Math.abs(dLeft) <= tolerance.edge && Math.abs(dTop) <= tolerance.edge && sizeOk(dWidth, dWidthPct) &&
      sizeOk(dHeight, dHeightPct),
    dLeft: dLeft,
    dTop: dTop,
    dWidth: dWidth,
    dHeight: dHeight,
    dWidthPct: dWidthPct,
    dHeightPct: dHeightPct
  };
}

// Converts an ink box in image pixels to keypad pixels at the given preview scale. Returns { left, top, width,
// height } or null for null.
export function toKeypadBox(box, scale) {
  return box === null ? null : {
    left: box.left / scale,
    top: box.top / scale,
    width: (box.right - box.left + 1) / scale,
    height: (box.bottom - box.top + 1) / scale
  };
}
