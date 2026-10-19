#!/bin/sh
# Builds the Chrome Web Store zip with only the files the extension needs.
set -e
cd "$(dirname "$0")/.."
version=$(sed -n 's/.*"version": "\(.*\)".*/\1/p' manifest.json)
out="dist/add-in-session-inbox-$version.zip"
mkdir -p dist
rm -f "$out"
zip -qr "$out" manifest.json icons src sidepanel -x '.*' '*/.*'
echo "$out"
