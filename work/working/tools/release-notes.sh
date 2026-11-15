#!/usr/bin/env bash
# Prints the CHANGELOG.md section of one version (without its heading), for the release description.
# Usage: release-notes.sh [version]      (default: work/working/VERSION; "Unreleased" prints [Unreleased])
# Exit: 0 printed, 1 version not found in CHANGELOG.md, 2 usage error or CHANGELOG.md missing.
set -u
kRoot="$(cd "$(dirname "$0")/../../.." && pwd)"; readonly kRoot
readonly kChangelog="$kRoot/CHANGELOG.md"

case "${1:-}" in -h|--help) sed -n '2,4p' "$0" >&2; exit 2 ;; esac
[ $# -le 1 ] || { sed -n '2,4p' "$0" >&2; exit 2; }
[ -f "$kChangelog" ] || { echo "FAIL $kChangelog missing" >&2; exit 2; }
VERSION="${1:-$(cat "$kRoot/work/working/VERSION")}"
awk -v v="[$VERSION]" '
  index($0, "## " v) == 1 { on = 1; found = 1; next }
  on && /^## \[/ { exit }
  on { print }
  END { exit found ? 0 : 1 }
' "$kChangelog" || { echo "FAIL version $VERSION not in CHANGELOG.md" >&2; exit 1; }
