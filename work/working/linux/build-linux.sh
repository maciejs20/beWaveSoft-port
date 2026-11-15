#!/usr/bin/env bash
# Builds the Linux app from working/src on the Electron version of the original (see ../lib-version.sh).
# Usage: build-linux.sh [output dir]      (default: working/build/linux)
# Environment: BEWAVE_VERSION overrides working/VERSION, ELECTRON_VERSION overrides the detected Electron version.
# Needs build/downloads/<electron>/electron-v<electron>-linux-x64.zip; a missing zip prints the download commands.
# Exit codes: 0 built, 1 build step failed, 2 usage error or missing Electron zip/original.
set -euo pipefail
WORKING="$(cd "$(dirname "$0")/.." && pwd)"
. "$WORKING/lib-version.sh"

if [ $# -gt 1 ] || [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  sed -n '2,6p' "$0" >&2
  exit 2
fi
OUT="${1:-$WORKING/build/linux}"
ZIP="$(bw_electron_zip linux-x64)" || exit 2
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

cp -a "$WORKING/app/." "$STAGE/"
cp -a "$WORKING/linux/natives/." "$STAGE/node_modules/"
node "$WORKING/tools/build-app.mjs" "$STAGE" || exit 1

rm -rf "$OUT"; mkdir -p "$OUT"
unzip -q "$ZIP" -d "$OUT"
mv "$OUT/electron" "$OUT/bewave-soft"
"$WORKING/tools/node_modules/.bin/asar" pack "$STAGE" "$OUT/resources/app.asar" --unpack '{*.node,*.exe}' || exit 1
bw_copy_original_resources "$OUT/resources" || exit 2
cp "$WORKING/linux/bw-pro-desktop-app-ico.png" "$WORKING/linux/run.sh" "$OUT/"
echo "OK linux: $OUT ($(bw_port_version), Electron $(bw_electron_version))"
