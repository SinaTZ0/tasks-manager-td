#!/usr/bin/env bash
# Builds a signed release and, given a target, uploads it (docs/deployment.md → Desktop Widget).
#   tools/desktop/release.sh <server-url> <version> [user@host:/path/to/checkout]
# <version> must be higher than the last one, or the apps ignore it. Without a target it stops at dist/release/.
set -euo pipefail
cd "$(dirname "$0")"

server=${1:?usage: release.sh <server-url> <version> [ssh-target]}
version=${2:?usage: release.sh <server-url> <version> [ssh-target]}
target=${3:-}
key=${TOFANG_UPDATER_KEY:-$HOME/.config/tofang/updater.key}
[[ -f "$key" ]] || { echo "no signing key at $key" >&2; exit 1; }

./build.sh "$server" "$version"
wails3="$(go env GOPATH)/bin/windows_amd64/wails3.exe"

# The platform and architecture are read from the file's name.
rm -rf dist/release
mkdir -p dist/release/windows/amd64
cp dist/Tofang.exe dist/release/Tofang.exe
cp dist/Tofang.exe "dist/release/windows/amd64/Tofang-$version-windows-amd64.exe"

# The CLI is a Windows program, so it reads the key by its Windows path.
(
  cd dist/release/windows/amd64
  "$wails3" updater manifest -version "$version" -channel stable -key "$(wslpath -w "$key")" -output stable.json \
    "Tofang-$version-windows-amd64.exe" >/dev/null
  "$wails3" updater verify -manifest stable.json -publickey ../../../../updater.key.pub
)

if [[ -n "$target" ]]; then
  rsync -a --delete dist/release/ "$target/desktop-releases/"
  echo "uploaded $version to $target"
else
  echo "built dist/release ($version); nothing uploaded"
fi
