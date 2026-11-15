// Satel TSH Soft graphics extracted at build time into dist/tsh/ (tools/tsh-assets.mjs): URLs and the theme list.
// The renderer page is app://renderer/index.html, but navigation linking changes the page path, so the URLs are
// absolute (/tsh/...); a relative "tsh/..." would resolve below the current route and get 404 from the app protocol.
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.installTshFonts = exports.TSH_FONT = exports.loadTshThemes = exports.tshAssetUrl = exports.TSH_ASSET_ROOT =
  undefined;
// Root of the extracted files, served by the app:// protocol from dist/tsh.
var TSH_ASSET_ROOT = exports.TSH_ASSET_ROOT = "/tsh/";
// Timeout of reading themes.json: a local file of 7 KB, so a slow read means it is broken.
var THEMES_TIMEOUT_MS = 5000;
// URL of a file under dist/tsh, e.g. "bg/BG_ABSTRACT.jpg" or "fonts/WDGT.ttf". Returns the URL.
var tshAssetUrl = exports.tshAssetUrl = function (file) {
  return TSH_ASSET_ROOT + file;
};
// Reads the 24 themes of TSH Soft (themes.json: name, background, backgroundFile, colors cl1..cl3, raw); the list
// order is the TSH theme number. Returns a promise of the array; rejects when the file is missing or not a list.
exports.loadTshThemes = async function () {
  var response = await fetch(tshAssetUrl("themes.json"), {
    signal: AbortSignal.timeout(THEMES_TIMEOUT_MS)
  });
  if (!response.ok) {
    throw new Error("themes.json: HTTP " + response.status);
  }
  var themes = await response.json();
  if (!Array.isArray(themes)) {
    throw new Error("themes.json is not a list");
  }
  return themes;
};
// CSS font families of the Satel fonts (dist/tsh/fonts): WDGT icons (an icon is the glyph of its code), Roboto
// Light for widget texts, Roboto Thin for the screensaver clock.
var TSH_FONT = exports.TSH_FONT = {
  icons: "TshIcons",
  light: "TshRobotoLight",
  thin: "TshRobotoThin"
};
// Id of the style element with the @font-face rules.
var FONT_STYLE_ID = "tsh-editor-fonts";
// Adds the @font-face rules of the Satel fonts to the page once (renderer only).
exports.installTshFonts = function () {
  if (typeof document === "undefined" || document.getElementById(FONT_STYLE_ID)) {
    return;
  }
  var style = document.createElement("style");
  style.id = FONT_STYLE_ID;
  style.textContent = [[TSH_FONT.icons, "WDGT.ttf"], [TSH_FONT.light, "ROBL.ttf"], [TSH_FONT.thin, "ROBT.ttf"]]
    .map(function (f) {
      return `@font-face { font-family: "${f[0]}"; src: url("${tshAssetUrl("fonts/" + f[1])}"); }`;
    }).join("\n");
  document.head.appendChild(style);
};
