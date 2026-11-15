#!/bin/bash
# Podpisuje ad-hoc przepakowana aplikacje i kopiuje ja do /Applications.
set -e
cd "$(dirname "$0")"
APP="BE WAVE Soft.app"
xattr -cr "$APP"
find "$APP/Contents/Resources" -type f \( -name '*.node' -o -name 'ffmpeg.exe' \) | while read -r f; do
  if file "$f" | grep -q Mach-O; then codesign --force --sign - "$f"; fi
done
codesign --force --deep --sign - "$APP"
rm -rf "/Applications/$APP"
ditto "$APP" "/Applications/$APP"
echo "Gotowe: /Applications/$APP"
open "/Applications/$APP"
