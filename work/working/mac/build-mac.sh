#!/usr/bin/env bash
# Builds "BE WAVE Soft.app" (arm64) from working/src and the stock Electron darwin zip of the original's Electron
# version (see ../lib-version.sh), plus mac/app-template. Sign and install on the Mac with zainstaluj.command.
# Usage: build-mac.sh [output dir]      (default: working/build/mac)
# Environment: BEWAVE_VERSION overrides working/VERSION, ELECTRON_VERSION overrides the detected Electron version.
# Needs build/downloads/<electron>/electron-v<electron>-darwin-arm64.zip and python3; runs on Linux and macOS.
# Exit codes: 0 built, 1 build step failed, 2 usage error, missing tool, Electron zip or original.
set -euo pipefail
WORKING="$(cd "$(dirname "$0")/.." && pwd)"
. "$WORKING/lib-version.sh"
readonly kTemplate="$WORKING/mac/app-template"
readonly kAppName="BE WAVE Soft"
readonly kHelperId="pl.satel.bewave.helper"

if [ $# -gt 1 ] || [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  sed -n '2,7p' "$0" >&2
  exit 2
fi
command -v python3 >/dev/null 2>&1 || { echo "FAIL python3 not found" >&2; exit 2; }
OUT="${1:-$WORKING/build/mac}"
ZIP="$(bw_electron_zip darwin-arm64)" || exit 2
ORIGINAL="$(bw_original_version)"
APP="$OUT/$kAppName.app"
C="$APP/Contents"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

mkdir -p "$STAGE/app"
cp -a "$WORKING/app/." "$STAGE/app/"
cp -a "$WORKING/mac/natives/." "$STAGE/app/node_modules/"
node "$WORKING/tools/build-app.mjs" "$STAGE/app" || exit 1

# Stock Electron.app -> BE WAVE Soft.app: main executable, helper apps and their executables.
unzip -q "$ZIP" -d "$STAGE/electron"
rm -rf "$OUT"; mkdir -p "$OUT"
mv "$STAGE/electron/Electron.app" "$APP"
mv "$C/MacOS/Electron" "$C/MacOS/$kAppName"
for helper in "$C/Frameworks/Electron Helper"*.app; do
  suffix="${helper##*/Electron Helper}"; suffix="${suffix%.app}"
  mv "$helper/Contents/MacOS/Electron Helper$suffix" "$helper/Contents/MacOS/$kAppName Helper$suffix"
  mv "$helper" "$C/Frameworks/$kAppName Helper$suffix.app"
done
rm -f "$C/Resources/default_app.asar" "$C/Resources/electron.icns"
cp "$kTemplate/bewave.icns" "$C/Resources/"
bw_copy_original_resources "$C/Resources" || exit 2
cp "$kTemplate/zainstaluj.command" "$OUT/"
chmod 755 "$OUT/zainstaluj.command"

# Info.plist files: template keys over the stock main plist, names and ids in the helper plists.
python3 -I - "$C" "$kTemplate/Info.plist" "$ORIGINAL" "$kAppName" "$kHelperId" <<'PY' || exit 1
import glob, os, plistlib, sys

contents, template, original, app_name, helper_id = sys.argv[1:]

def load(path):
    with open(path, 'rb') as f:
        return plistlib.load(f)

def save(path, data):
    with open(path + '.tmp', 'wb') as f:
        plistlib.dump(data, f)
    os.replace(path + '.tmp', path)

main_path = os.path.join(contents, 'Info.plist')
main = load(main_path)
for key, value in load(template).items():
    main[key] = original if value == '@ORIGINAL_VERSION@' else value
# The integrity hash covers the removed default_app.asar; the 1.1.0 Satel build has no such key either.
main.pop('ElectronAsarIntegrity', None)
save(main_path, main)

for helper in glob.glob(os.path.join(contents, 'Frameworks', app_name + ' Helper*.app')):
    name = os.path.basename(helper)[:-len('.app')]
    path = os.path.join(helper, 'Contents', 'Info.plist')
    data = load(path)
    data.update(CFBundleDisplayName=name, CFBundleExecutable=name, CFBundleName=name,
                CFBundleIdentifier=helper_id)
    save(path, data)
PY

"$WORKING/tools/node_modules/.bin/asar" pack "$STAGE/app" "$C/Resources/app.asar" --unpack '{*.node,*.exe}' || exit 1
echo "OK mac: $APP ($(bw_port_version), Electron $(bw_electron_version))"
