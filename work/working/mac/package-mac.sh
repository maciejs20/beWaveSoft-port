#!/usr/bin/env bash
# Builds the macOS .pkg installer. Installing a newer one upgrades in place; user data stays in ~/Library.
# Needs xar, mkbom (bomutils), cpio and fakeroot. Usage: package-mac.sh [version]
set -euo pipefail
WORKING="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="${1:-$(cat "$WORKING/VERSION")}"
# Installer version: 1.2.0-mod3.0 -> 1.2.0.3.0 (sorts above the released 1.2.0.2), legacy 1.2.0-port.2 -> 1.2.0.2.
case "$VERSION" in
  *-mod*) PKG_VERSION="${VERSION/-mod/.}" ;;
  *) PKG_VERSION="${VERSION/-port./.}" ;;
esac
IDENTIFIER="pl.satel.bewave.port"
OUT="$WORKING/build/release"
PKG="$OUT/BE-WAVE-Soft-$VERSION-arm64.pkg"
# Every build gets a new name: an existing file is never overwritten.
if [ -e "$PKG" ]; then
  echo "FAIL $PKG already exists: bump working/VERSION (modX.Y) instead of overwriting a build" >&2
  exit 1
fi
APP="$WORKING/build/mac/BE WAVE Soft.app"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

"$WORKING/mac/build-mac.sh"
rm -f "$WORKING/build/mac/zainstaluj.command"
printf '%s\n' "$VERSION" > "$APP/Contents/Resources/port-version"
python3 - "$APP/Contents/Info.plist" "$VERSION" <<'PY'
import plistlib, sys
path, version = sys.argv[1:]
with open(path, 'rb') as f:
    plist = plistlib.load(f)
plist['CFBundleShortVersionString'] = version
with open(path, 'wb') as f:
    plistlib.dump(plist, f)
PY

mkdir -p "$OUT" "$STAGE/root" "$STAGE/scripts" "$STAGE/flat/base.pkg"
cp -a "$APP" "$STAGE/root/"
chmod -R u+rwX,go+rX,go-w "$STAGE/root"
install -m 755 "$WORKING/mac/pkg/preinstall" "$WORKING/mac/pkg/postinstall" "$STAGE/scripts/"
FILES="$(find "$STAGE/root" | wc -l)"
SIZE_KB="$(du -sk "$STAGE/root" | cut -f1)"

cat > "$STAGE/flat/base.pkg/PackageInfo" <<INFO
<?xml version="1.0" encoding="utf-8"?>
<pkg-info format-version="2" identifier="$IDENTIFIER" version="$PKG_VERSION" install-location="/Applications" auth="root" postinstall-action="none">
    <payload numberOfFiles="$FILES" installKBytes="$SIZE_KB"/>
    <scripts>
        <preinstall file="./preinstall"/>
        <postinstall file="./postinstall"/>
    </scripts>
</pkg-info>
INFO
cat > "$STAGE/flat/Distribution" <<DIST
<?xml version="1.0" encoding="utf-8"?>
<installer-gui-script minSpecVersion="2">
    <title>BE WAVE Soft</title>
    <options customize="never" require-scripts="false" hostArchitectures="arm64"/>
    <domains enable_anywhere="false" enable_currentUserHome="false" enable_localSystem="true"/>
    <choices-outline><line choice="default"/></choices-outline>
    <choice id="default" title="BE WAVE Soft"><pkg-ref id="$IDENTIFIER"/></choice>
    <pkg-ref id="$IDENTIFIER" version="$PKG_VERSION" auth="root" installKBytes="$SIZE_KB">#base.pkg</pkg-ref>
</installer-gui-script>
DIST

fakeroot sh -c '
  chown -R 0:80 "$1/root" "$1/scripts"
  (cd "$1/root" && find . | cpio -o --format odc --quiet) | gzip -6 > "$1/flat/base.pkg/Payload"
  (cd "$1/scripts" && find . | cpio -o --format odc --quiet) | gzip -6 > "$1/flat/base.pkg/Scripts"
  mkbom -u 0 -g 80 "$1/root" "$1/flat/base.pkg/Bom"
' sh "$STAGE"
(cd "$STAGE/flat" && xar --compression none -cf "$PKG" Distribution base.pkg)
ls -la "$PKG"
