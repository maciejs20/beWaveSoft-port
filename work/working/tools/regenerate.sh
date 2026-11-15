#!/usr/bin/env bash
# Generates work/deobfuscated/<version>/named from work/deobfuscated/<version>/raw (made by deobfuscate.sh),
# in the same form as working/src before our edits: base for comparisons and 3-way merges only, since
# working/src is edited by hand. Version-specific inputs come from tools/versions/<version>/:
# module-overrides.json (renderer module id -> path, for a new release written by match-modules.mjs),
# name-main.json (main process ids and names, for a new release written by port-name-main.mjs),
# manual-names.json (optional, hand-chosen binding names), version.json (optional): "namesFrom" names
# the previous release whose named tree lends its binding names to app and main files (carry-names.mjs),
# so that unchanged code is identical across releases.
#
# Usage: regenerate.sh <version> [--parse <log>]
#   --parse <log> print the summary of an earlier run
# Log: /tmp/bewave-regenerate-<version>.log (full tool output); stdout: one line per step.
# Exit: 0 all steps OK, 1 a step failed (output kept in named.partial), 2 usage error, missing input,
#       another run active.
set -u

kTools="$(cd "$(dirname "$0")" && pwd)"; readonly kTools
kWork="$(cd "$kTools/../.." && pwd)"; readonly kWork
readonly kNodeHeap=12000          # MB; restructure and un-regenerator need ~9 GB on 1.1.0 (2026-10-30)
readonly kLock="/tmp/bewave-regenerate.lock"

# Prints usage and exits 2.
usage() {
  sed -n '8,13p' "$0" | sed 's/^# \{0,1\}//'
  exit 2
}

# Prints the step summary lines of a log.
parse_log() {
  grep -E '^(OK|WARN|FAIL) |^SUMMARY ' "$1"
}

version=""
while [ $# -gt 0 ]; do
  case "$1" in
    --parse) [ $# -ge 2 ] || usage; [ -f "$2" ] || { echo "FAIL no log $2"; exit 2; }; parse_log "$2"; exit 0 ;;
    -*) usage ;;
    *) [ -z "$version" ] || usage; version="$1" ;;
  esac
  shift
done
[ -n "$version" ] || usage

readonly kRaw="$kWork/deobfuscated/$version/raw"
readonly kOut="$kWork/deobfuscated/$version/named"
readonly kDist="$kWork/original/$version/app/dist"
readonly kConfig="$kTools/versions/$version"
readonly kLog="/tmp/bewave-regenerate-$version.log"
for f in "$kRaw/bundle.web/bundle.json" "$kRaw/bundle.web.classify.json" "$kRaw/electron.main/index.js" \
  "$kRaw/electron.preload/index.js" "$kRaw/electron.entry/index.js" "$kDist/bundle.web.js" \
  "$kConfig/module-overrides.json" "$kConfig/name-main.json"; do
  [ -f "$f" ] || { echo "FAIL missing $f"; exit 2; }
done
command -v node >/dev/null || { echo "FAIL node not in PATH"; exit 2; }

mkdir "$kLock" 2>/dev/null || { echo "FAIL another regenerate run holds $kLock"; exit 2; }
readonly kPartial="$kOut.partial"
trap 'rmdir "$kLock"' EXIT
: >"$kLog"
failures=0

# Runs one step: name, then the command; logs output, prints OK/FAIL and counts failures.
step() {
  local name="$1"; shift
  echo "### $name: $*" >>"$kLog"
  if "$@" >>"$kLog" 2>&1; then
    echo "OK $name" | tee -a "$kLog"
  else
    echo "FAIL $name (see $kLog)" | tee -a "$kLog"
    failures=$((failures + 1))
  fi
}

# Removes the webpack public path (`require.p + "src/assets/..."`), empty in this app.
strip_public_path() {
  grep -rlZ --include='*.js' 'require\.p + ' "$kPartial/renderer" | xargs -0 -r sed -i 's/require\.p + //g'
}

# Writes main/entry.js from electron.entry (`(0, require("./N.js").default)(arg)` -> main.js default).
write_entry() {
  local call
  call="$(sed -n 's/^(0, require("\.\/[0-9]*\.js")\.default)(\(.*\));$/require(".\/main").default(\1);/p' \
    "$kRaw/electron.entry/index.js")"
  [ -n "$call" ] || { echo "electron.entry/index.js: unexpected form"; return 1; }
  printf '%s\n' "$call" >"$kPartial/main/entry.js"
}

# Writes preload/preload.js from electron.preload, its only dependency being electron.
write_preload() {
  mkdir -p "$kPartial/preload"
  sed 's/require("\.\/1\.js")/require("electron")/' "$kRaw/electron.preload/index.js" >"$kPartial/preload/preload.js"
  ! grep -q 'require("\./[0-9]*\.js")' "$kPartial/preload/preload.js"
}

# Copies the static renderer files (index.html, main.css, assets) from dist.
copy_static() {
  mkdir -p "$kPartial/static" && cp -r "$kDist/index.html" "$kDist/main.css" "$kDist/src" "$kPartial/static/"
}

rm -rf "$kPartial"
step restructure node --max-old-space-size=$kNodeHeap "$kTools/restructure.mjs" "$kRaw/bundle.web" \
  "$kRaw/bundle.web.classify.json" "$kPartial/renderer" "$kConfig/module-overrides.json"
step name-main node "$kTools/name-main.mjs" "$kRaw/electron.main" "$kPartial/main" "$kConfig/name-main.json"
step un-regenerator node --max-old-space-size=$kNodeHeap "$kTools/un-regenerator.mjs" \
  "$kPartial/main" "$kPartial/renderer/app"
if [ -f "$kConfig/manual-names.json" ]; then
  step manual-names node "$kTools/apply-manual-names.mjs" "$kPartial" "$kConfig/manual-names.json"
fi
step esmodule-flag node "$kTools/restore-esmodule-flag.cjs" "$kDist/bundle.web.js" \
  "$kRaw/bundle.web.split.json" "$kPartial/renderer"
step public-path strip_public_path
step entry write_entry
step preload write_preload
step static copy_static
names_from="$(node -e 'try { process.stdout.write(require(process.argv[1]).namesFrom ?? "") } catch {}' \
  "$kConfig/version.json")"
if [ -n "$names_from" ]; then
  if [ -d "$kWork/deobfuscated/$names_from/named" ]; then
    step "carry-names from $names_from" node --max-old-space-size=$kNodeHeap "$kTools/carry-names.mjs" \
      "$kWork/deobfuscated/$names_from/named" "$kPartial" renderer/app main preload
  else
    echo "FAIL carry-names: $kWork/deobfuscated/$names_from/named missing (regenerate.sh $names_from first)" | tee -a "$kLog"
    failures=$((failures + 1))
  fi
fi

if [ "$failures" -eq 0 ]; then
  rm -rf "$kOut" && mv "$kPartial" "$kOut"
  echo "SUMMARY $version: named in $kOut, $(find "$kOut" -name '*.js' | wc -l) js files" | tee -a "$kLog"
  exit 0
fi
echo "SUMMARY $version: $failures step(s) failed, output kept in $kPartial" | tee -a "$kLog"
exit 1
