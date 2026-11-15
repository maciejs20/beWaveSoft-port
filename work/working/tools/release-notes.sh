#!/usr/bin/env bash
# Prints the release description: a fixed notice (build it yourself, TSH editor BETA, no warranty), then the
# CHANGELOG.md section of one version without its heading.
# Usage: release-notes.sh [version]      (default: work/working/VERSION; "Unreleased" prints [Unreleased])
# Exit: 0 printed, 1 version not found in CHANGELOG.md, 2 usage error or CHANGELOG.md missing.
set -u
kRoot="$(cd "$(dirname "$0")/../../.." && pwd)"; readonly kRoot
readonly kChangelog="$kRoot/CHANGELOG.md"

case "${1:-}" in -h|--help) sed -n '2,5p' "$0" >&2; exit 2 ;; esac
[ $# -le 1 ] || { sed -n '2,5p' "$0" >&2; exit 2; }
[ -f "$kChangelog" ] || { echo "FAIL $kChangelog missing" >&2; exit 2; }
VERSION="${1:-$(cat "$kRoot/work/working/VERSION")}"
grep -qF "## [$VERSION]" "$kChangelog" || { echo "FAIL version $VERSION not in CHANGELOG.md" >&2; exit 1; }
cat <<'NOTICE'
> **Zachęcamy do zbudowania instalatora samodzielnie** z oficjalnego instalatora Satel, z pomocą agenta AI:
> instrukcja krok po kroku w README repozytorium. Gotowe paczki poniżej są dla tych, którzy nie mogą tego zrobić.
>
> **Edytor ekranów klawiatur TSH to wersja BETA:** sprawdzony przez autora i działa poprawnie, ale nie jest jeszcze
> dostatecznie przetestowany. Przed zapisem ekranów do klawiatury zrób kopię konfiguracji centrali.
>
> Port nieoficjalny, niezwiązany z firmą SATEL; bez gwarancji poprawności działania. Sprawdź pliki sumami z
> `SHA256SUMS.txt`.

NOTICE
awk -v v="[$VERSION]" '
  index($0, "## " v) == 1 { on = 1; found = 1; next }
  on && /^## \[/ { exit }
  on { print }
  END { exit found ? 0 : 1 }
' "$kChangelog" || { echo "FAIL version $VERSION not in CHANGELOG.md" >&2; exit 1; }
