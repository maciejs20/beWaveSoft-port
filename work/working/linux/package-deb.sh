#!/usr/bin/env bash
# Builds a .deb from working/src, separately from working/build/linux, which may be running. Installing a newer one upgrades in place; user data stays in ~/.config.
# Usage: package-deb.sh [version]
# Environment: BW_MAINTAINER sets the Maintainer field (default: neutral project name, no personal e-mail).
set -euo pipefail
WORKING="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="${1:-$(cat "$WORKING/VERSION")}"
DEB_VERSION="${VERSION/-port./+port}"
OUT="$WORKING/build/release"
MAINTAINER="${BW_MAINTAINER:-BE WAVE Soft port <bewave-soft-port@users.noreply.github.com>}"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

mkdir -p "$STAGE/opt"
"$WORKING/linux/build-linux.sh" "$STAGE/opt/bewave-soft" >/dev/null
mkdir -p "$STAGE/usr/bin" "$STAGE/usr/share/applications" "$STAGE/usr/share/icons/hicolor/256x256/apps" "$STAGE/DEBIAN" "$OUT"
rm -f "$STAGE/opt/bewave-soft/run.sh"
chmod -R u+rwX,go+rX,go-w "$STAGE/opt/bewave-soft"
install -m 755 "$WORKING/linux/bewave-soft.launcher" "$STAGE/usr/bin/bewave-soft"
install -m 644 "$WORKING/linux/bewave-soft.desktop" "$STAGE/usr/share/applications/bewave-soft.desktop"
install -m 644 "$WORKING/linux/bw-pro-desktop-app-ico.png" "$STAGE/usr/share/icons/hicolor/256x256/apps/bewave-soft.png"
install -m 755 "$WORKING/linux/deb/postinst" "$STAGE/DEBIAN/postinst"
cat > "$STAGE/DEBIAN/control" <<CONTROL
Package: bewave-soft
Version: $DEB_VERSION
Section: utils
Priority: optional
Architecture: amd64
Installed-Size: $(du -sk "$STAGE/opt" | cut -f1)
Depends: libnss3, libgtk-3-0t64 | libgtk-3-0, libgbm1, libasound2t64 | libasound2, libnotify4, libxss1, libsecret-1-0, xdg-utils
Maintainer: $MAINTAINER
Description: BE WAVE Soft desktop port
 Linux port of the BE WAVE Soft hub client.
CONTROL
dpkg-deb --root-owner-group --build "$STAGE" "$OUT/bewave-soft_${DEB_VERSION}_amd64.deb" >/dev/null
ls -la "$OUT/bewave-soft_${DEB_VERSION}_amd64.deb"
