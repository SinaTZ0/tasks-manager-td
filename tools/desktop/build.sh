#!/usr/bin/env bash
# Builds the Windows app from WSL: dist/Tofang.exe, which talks to <server-url> and reports <version>.
#   tools/desktop/build.sh <server-url> [version]
# With no version it is a development build, which doesn't look for updates.
# The Wails CLI needs GTK to build on Linux, so its Windows build runs through WSL's interop.
set -euo pipefail
cd "$(dirname "$0")"

server=${1:?usage: build.sh <server-url> [version]}
version=${2:-dev}

wails3="$(go env GOPATH)/bin/windows_amd64/wails3.exe"
[[ -x "$wails3" ]] || GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go install github.com/wailsapp/wails/v3/cmd/wails3@v3.1.0

# The icon, version details and the DPI manifest. Go links a *_windows_amd64.syso into the build by its name.
"$wails3" generate syso -arch amd64 -icon ../../public/favicon.ico -manifest tofang.exe.manifest -info info.json \
  -out tofang_windows_amd64.syso >/dev/null

mkdir -p dist
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -tags production \
  -ldflags "-H windowsgui -s -w -X main.serverURL=$server -X main.version=$version" -o dist/Tofang.exe .
echo "built dist/Tofang.exe ($version, $server)"
