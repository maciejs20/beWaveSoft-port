# shellcheck shell=bash
# Shared version helpers for the build scripts in linux/ and mac/. Source it, do not run it (bash 3.2+).
#   . "$WORKING/lib-version.sh"
# Single source of truth:
#   port version     - working/VERSION ("<original>-port.<n>"), override: BEWAVE_VERSION
#   original version - the part of the port version before "-port"
#   Electron version - the "Electron/x.y.z" string in original/<original>/win-build/BE WAVE Soft/BE WAVE Soft.exe,
#                      override: ELECTRON_VERSION
# Electron zips are never downloaded here: a missing zip prints the download commands and returns 2.
# A zip is checked against SHASUMS256.txt when that file lies next to it.

BW_WORKING="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BW_ELECTRON_RELEASES="https://github.com/electron/electron/releases/download"
# Files the original's main process reads from process.resourcesPath on every platform. 1.2.0 shows splash.jpg
# at startup; 1.1.0 has none of them. The .ico files are read only on win32 and TSH Soft (v*) is not shipped.
BW_ORIGINAL_RESOURCES="splash.jpg"

# Prints the port version, e.g. 1.1.0-port.3.
bw_port_version() {
  if [ -n "${BEWAVE_VERSION:-}" ]; then
    printf '%s\n' "$BEWAVE_VERSION"
  else
    tr -d ' \t\r\n' < "$BW_WORKING/VERSION"
    printf '\n'
  fi
}

# Prints the original Satel version, e.g. 1.1.0.
bw_original_version() {
  local port
  port="$(bw_port_version)"
  printf '%s\n' "${port%%-port*}"
}

# Prints the Electron version the original Windows build ships, e.g. 41.6.1.
bw_electron_version() {
  if [ -n "${ELECTRON_VERSION:-}" ]; then
    printf '%s\n' "$ELECTRON_VERSION"
    return 0
  fi
  local orig exe ev
  orig="$(bw_original_version)"
  exe="$BW_WORKING/../original/$orig/win-build/BE WAVE Soft/BE WAVE Soft.exe"
  if [ ! -f "$exe" ]; then
    echo "FAIL electron version: missing $exe" >&2
    return 2
  fi
  ev="$(LC_ALL=C grep -a -o -m1 'Electron/[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*' "$exe" | head -n1)"
  if [ -z "$ev" ]; then
    echo "FAIL electron version: no Electron/x.y.z string in $exe" >&2
    return 2
  fi
  printf '%s\n' "${ev#Electron/}"
}

# Prints the SHA-256 of file $1 (sha256sum on Linux, shasum on macOS).
bw_sha256() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | cut -d' ' -f1
  else
    shasum -a 256 "$1" | cut -d' ' -f1
  fi
}

# Prints the path of the Electron zip for platform $1 (linux-x64, darwin-arm64) after checking it.
# Missing zip or checksum mismatch -> message on stderr, return 2.
bw_electron_zip() {
  local platform="$1" ev dir name zip want got
  ev="$(bw_electron_version)" || return 2
  dir="$BW_WORKING/build/downloads/$ev"
  name="electron-v$ev-$platform.zip"
  zip="$dir/$name"
  if [ ! -f "$zip" ]; then
    {
      echo "FAIL missing $zip"
      echo "Download it (and the checksums), then rerun:"
      echo "  mkdir -p '$dir' && cd '$dir'"
      echo "  curl -fLO $BW_ELECTRON_RELEASES/v$ev/$name"
      echo "  curl -fLO $BW_ELECTRON_RELEASES/v$ev/SHASUMS256.txt"
    } >&2
    return 2
  fi
  if [ -f "$dir/SHASUMS256.txt" ]; then
    want="$(grep " \*$name\$" "$dir/SHASUMS256.txt" | cut -d' ' -f1)"
    got="$(bw_sha256 "$zip")"
    if [ -z "$want" ] || [ "$want" != "$got" ]; then
      echo "FAIL $zip: SHA-256 $got does not match SHASUMS256.txt (${want:-no entry})" >&2
      return 2
    fi
  else
    echo "WARN $zip: no SHASUMS256.txt next to it, checksum not verified" >&2
  fi
  printf '%s\n' "$zip"
}

# Copies the BW_ORIGINAL_RESOURCES files that the original Windows build ships into directory $1 (the app's
# resources). A file the original does not have is skipped, because its main process does not read it.
# Missing original -> message on stderr, return 2.
bw_copy_original_resources() {
  local dest="$1" orig res name
  orig="$(bw_original_version)"
  res="$BW_WORKING/../original/$orig/win-build/BE WAVE Soft/resources"
  if [ ! -d "$res" ]; then
    echo "FAIL original resources: missing $res" >&2
    return 2
  fi
  for name in $BW_ORIGINAL_RESOURCES; do
    if [ -f "$res/$name" ]; then
      cp "$res/$name" "$dest/" || return 2
    fi
  done
}
