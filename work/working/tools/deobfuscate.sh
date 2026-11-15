#!/usr/bin/env bash
# Produces work/deobfuscated/<version>/raw (webcrack output) from work/original/<version>/app/dist.
# Every dist/*.js except the renderer bundle goes through the webcrack CLI as a whole. The renderer
# bundle (bundle.web.js, ~57 MB) is split into modules (split-webpack.mjs), unpacked in batches
# (unpack-batches.mjs, same layout as a full webcrack run, far less memory) and its modules are
# matched to node_modules sources (classify-modules.mjs). Next step: regenerate.sh <version>.
#
# Usage: deobfuscate.sh <version> [--out <dir>] [--force]
#        deobfuscate.sh --parse <log>
#   --out <dir>   write to <dir> instead of work/deobfuscated/<version>/raw (e.g. to compare)
#   --force       replace an existing output directory
#   --parse <log> print the summary of an earlier run
# Log: /tmp/bewave-deobfuscate-<version>.log (full tool output); stdout: one line per step.
# Exit: 0 all steps OK, 1 a step failed or modules fell back to raw source, 2 usage error,
#       missing input or tool, output exists, another run active.
set -u

kTools="$(cd "$(dirname "$0")" && pwd)"; readonly kTools
kWork="$(cd "$kTools/../.." && pwd)"; readonly kWork
readonly kNodeHeap=12000          # MB; webcrack batches and classify need ~8 GB on bundle.web (2026-11-13)
readonly kBatchBytes=2000000      # bundle bytes per webcrack batch (unpack-batches.mjs default)
readonly kLock="/tmp/bewave-deobfuscate.lock"
readonly kBundle="bundle.web"     # renderer bundle, unpacked in batches

# Prints usage and exits 2.
usage() {
  sed -n '8,15p' "$0" | sed 's/^# \{0,1\}//'
  exit 2
}

# Prints the step summary lines of a log.
parse_log() {
  grep -E '^(OK|WARN|FAIL) |^FAIL module |^SUMMARY ' "$1"
}

version="" out="" force=0
while [ $# -gt 0 ]; do
  case "$1" in
    --parse) [ $# -ge 2 ] || usage; [ -f "$2" ] || { echo "FAIL no log $2"; exit 2; }; parse_log "$2"; exit 0 ;;
    --out) [ $# -ge 2 ] || usage; out="$2"; shift ;;
    --force) force=1 ;;
    -*) usage ;;
    *) [ -z "$version" ] || usage; version="$1" ;;
  esac
  shift
done
[ -n "$version" ] || usage

readonly kDist="$kWork/original/$version/app/dist"
readonly kNodeModules="$kWork/original/$version/app/node_modules"
readonly kLog="/tmp/bewave-deobfuscate-$version.log"
[ -n "$out" ] || out="$kWork/deobfuscated/$version/raw"
[ -f "$kDist/$kBundle.js" ] || { echo "FAIL missing $kDist/$kBundle.js"; exit 2; }
[ -d "$kNodeModules" ] || { echo "FAIL missing $kNodeModules"; exit 2; }
[ -x "$kTools/node_modules/.bin/webcrack" ] || { echo "FAIL webcrack missing: npm ci in $kTools"; exit 2; }
command -v node >/dev/null || { echo "FAIL node not in PATH"; exit 2; }
if [ -e "$out" ] && [ "$force" -ne 1 ]; then echo "FAIL $out exists (use --force)"; exit 2; fi

mkdir "$kLock" 2>/dev/null || { echo "FAIL another deobfuscate run holds $kLock"; exit 2; }
partial="$out.partial"
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

mkdir -p "$partial"
for file in "$kDist"/*.js; do
  name="$(basename "$file" .js)"
  [ "$name" = "$kBundle" ] && continue
  step "$name" "$kTools/node_modules/.bin/webcrack" "$file" -o "$partial/$name" -f
done
step "$kBundle split" node "$kTools/split-webpack.mjs" "$kDist/$kBundle.js" "$partial/$kBundle.split.json"
step "$kBundle unpack" node --max-old-space-size=$kNodeHeap "$kTools/unpack-batches.mjs" \
  "$kDist/$kBundle.js" "$partial/$kBundle.split.json" "$partial/$kBundle" "$kBatchBytes"
grep '^FAIL module ' "$kLog" | head -20
step "$kBundle classify" node --max-old-space-size=$kNodeHeap "$kTools/classify-modules.mjs" \
  "$kDist/$kBundle.js" "$partial/$kBundle.split.json" "$kNodeModules" "$partial/$kBundle.classify.json"

if [ "$failures" -eq 0 ]; then
  rm -rf "$out" && mv "$partial" "$out"
  echo "SUMMARY $version: raw in $out, $(find "$out/$kBundle" -name '*.js' | wc -l) renderer modules" | tee -a "$kLog"
  exit 0
fi
echo "SUMMARY $version: $failures step(s) failed, partial output kept in $partial (rerun resumes)" | tee -a "$kLog"
exit 1
