Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.modVersion = undefined;
// Our full version (working/VERSION or BEWAVE_VERSION, e.g. "1.2.0-mod3.1"), injected by tools/build-app.mjs through
// esbuild `define` as __BEWAVE_MOD_VERSION__. Used only for display (splash, version label); Satel logic keeps
// app.getVersion() / package.json "version". Returns the injected string, or `fallback` when not injected (unit tests, node).
exports.modVersion = function (fallback) {
  var injected = typeof __BEWAVE_MOD_VERSION__ === "string" ? __BEWAVE_MOD_VERSION__ : "";
  return injected || fallback;
};
