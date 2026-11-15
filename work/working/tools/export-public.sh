#!/usr/bin/env bash
# Exports the public part of this repository (tools/public-files.txt: recipes, docs, tools, tests, our own
# modules; no Satel code) into a separate git repository and checks it for personal data.
# Usage: export-public.sh <target dir> [--commit <message>] [--untracked]
#   <target dir>        public repository; created with "git init -b main" when missing
#   --commit <message>  commit the export there; author from BW_PUBLIC_AUTHOR="Name <e-mail>" (required)
#   --untracked         preview: export the working tree, including untracked, not ignored files
# Personal patterns (your name, e-mail, hub name, local paths), one extended regex per line, live outside the repo
# in ~/.config/bewave-soft/leak-patterns (override with BW_LEAK_FILE); without that file the export is refused.
# Log: /tmp/bewave-export-public.log. Exports committed files of HEAD only (uncommitted edits stay private).
# Exit: 0 exported (and committed), 1 forbidden text found (nothing committed), 2 usage error, missing tool,
#       wrong directory or another export running.
set -u

kTools="$(cd "$(dirname "$0")" && pwd)"; readonly kTools
kRoot="$(cd "$kTools/../../.." && pwd)"; readonly kRoot
readonly kList="$kTools/public-files.txt"
readonly kLog="/tmp/bewave-export-public.log"
readonly kLock="/tmp/bewave-export-public.lock"
readonly kLeakFile="${BW_LEAK_FILE:-$HOME/.config/bewave-soft/leak-patterns}"
# Generic text that must never reach the public repository: home directories of a real user.
readonly kLeaks='/home/[a-z][a-z0-9_-]*/|/Users/[A-Za-z]'

# Prints usage from the header and exits 2.
usage() { sed -n '2,11p' "$0" >&2; exit 2; }

# Runs git on the source repository (NFS checkouts may belong to another uid).
src_git() { git -c safe.directory='*' -C "$kRoot" "$@"; }

# Runs git on the target repository, same ownership caveat.
dst_git() { git -c safe.directory='*' -C "$TARGET" "$@"; }

TARGET=""; MESSAGE=""; UNTRACKED=()
while [ $# -gt 0 ]; do
  case "$1" in
    --commit) [ $# -ge 2 ] || usage; MESSAGE="$2"; shift 2 ;;
    --untracked) UNTRACKED=(--others --exclude-standard); shift ;;
    -h|--help) usage ;;
    -*) usage ;;
    *) [ -z "$TARGET" ] || usage; TARGET="$1"; shift ;;
  esac
done
[ -n "$TARGET" ] || usage
command -v git >/dev/null 2>&1 || { echo "FAIL git not found" >&2; exit 2; }
command -v rsync >/dev/null 2>&1 || { echo "FAIL rsync not found" >&2; exit 2; }
[ -f "$kList" ] && [ -f "$kRoot/mod-recipes/README.md" ] || { echo "FAIL not in the BE WAVE Soft repo" >&2; exit 2; }
[ -s "$kLeakFile" ] || { echo "FAIL missing $kLeakFile (your personal patterns, one regex per line)" >&2; exit 2; }
if [ -n "$MESSAGE" ] && [ -z "${BW_PUBLIC_AUTHOR:-}" ]; then
  echo "FAIL --commit needs BW_PUBLIC_AUTHOR=\"Name <e-mail>\" (e.g. a GitHub noreply address)" >&2; exit 2
fi
mkdir "$kLock" 2>/dev/null || { echo "FAIL another export is running ($kLock)" >&2; exit 2; }
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"; rmdir "$kLock"' EXIT
: > "$kLog"

# 1. Resolve the allow-list to tracked files and copy them to a stage.
SPECS=()
while IFS= read -r line; do
  case "$line" in ''|'#'*) continue ;; '!'*) SPECS+=(":(glob,exclude)${line#!}") ;; *) SPECS+=(":(glob)$line") ;; esac
done < "$kList"
mkdir "$STAGE/tree"
if [ ${#UNTRACKED[@]} -gt 0 ]; then
  src_git ls-files -z --cached "${UNTRACKED[@]}" -- "${SPECS[@]}" > "$STAGE/files" || { echo "FAIL git ls-files" >&2; exit 2; }
  rsync -rlpt --from0 --files-from="$STAGE/files" "$kRoot/" "$STAGE/tree/" >> "$kLog" 2>&1 || { echo "FAIL copy" >&2; exit 2; }
else
  src_git archive --format=tar -o "$STAGE/head.tar" HEAD -- "${SPECS[@]}" 2>> "$kLog" \
    || { echo "FAIL git archive (see $kLog)" >&2; exit 2; }
  tar -x -C "$STAGE/tree" -f "$STAGE/head.tar" || { echo "FAIL tar" >&2; exit 2; }
  tar -t -f "$STAGE/head.tar" | grep -v '/$' | tr '\n' '\0' > "$STAGE/files"
fi
COUNT="$(tr -cd '\0' < "$STAGE/files" | wc -c)"

# 2. Forbidden text check on the stage, before anything reaches the target.
PATTERN="$kLeaks$(grep -v '^[[:space:]]*\(#\|$\)' "$kLeakFile" | sed 's/^/|/' | tr -d '\n')"
if grep -rnIE "$PATTERN" "$STAGE/tree" > "$STAGE/leaks"; then
  sed "s|^$STAGE/tree/||" "$STAGE/leaks" | tee -a "$kLog" | sed 's/^/FAIL leak /' >&2
  echo "$COUNT files, $(wc -l < "$STAGE/leaks") forbidden lines; nothing exported" >&2
  exit 1
fi

# 3. Sync the stage into the target (its .git stays) and optionally commit.
mkdir -p "$TARGET" || exit 2
[ -d "$TARGET/.git" ] || dst_git init -q -b main || exit 2
rsync -rlpt --delete --exclude=/.git "$STAGE/tree/" "$TARGET/" >> "$kLog" 2>&1 || { echo "FAIL sync" >&2; exit 2; }
dst_git add -A
# Executable bits come from the source index: checkouts with core.fileMode=false (NFS) do not see them.
src_git ls-files -s | awk '$1 == "100755" { sub(/^[^\t]*\t/, ""); print }' | while IFS= read -r f; do
  [ -f "$TARGET/$f" ] && dst_git update-index --chmod=+x -- "$f"
done
CHANGED="$(dst_git status --porcelain | wc -l)"
echo "OK exported $COUNT files to $TARGET ($CHANGED changed)"
if [ -n "$MESSAGE" ] && [ "$CHANGED" -gt 0 ]; then
  NAME="${BW_PUBLIC_AUTHOR% <*}"; EMAIL="${BW_PUBLIC_AUTHOR##*<}"; EMAIL="${EMAIL%>}"
  dst_git -c user.name="$NAME" -c user.email="$EMAIL" commit -q -m "$MESSAGE" >> "$kLog" 2>&1 \
    || { echo "FAIL commit (see $kLog)" >&2; exit 2; }
  echo "OK committed $(dst_git rev-parse --short HEAD) as $NAME"
fi
echo "Not checked: binary files and image contents; review 'git -C $TARGET diff --cached --stat' before pushing."
