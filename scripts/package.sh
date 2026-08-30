#!/usr/bin/env bash
# Assemble le paquet téléchargeable (theme.css + theme.js + README + LICENCE)
# publié en pièce jointe de la Release GitHub à chaque tag. Utilisable en
# local pour vérifier le contenu avant de taguer :
#   VERSION=0.0.0-test scripts/package.sh
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION="${VERSION:-}"
if [ -z "$VERSION" ]; then
  VERSION="${GITHUB_REF_NAME:-0.0.0-local}"
  VERSION="${VERSION#v}"
fi
PKG="foulee-${VERSION}"

rm -rf "$PKG" "${PKG}.zip" "${PKG}.tar.gz"
mkdir "$PKG"
cp theme.css theme.js README.md LICENSE "$PKG"/

zip -r "${PKG}.zip" "$PKG" > /dev/null
tar -czf "${PKG}.tar.gz" "$PKG"

echo "PKG=${PKG}" >> "${GITHUB_ENV:-/dev/null}"
echo "Paquet prêt : ${PKG}.zip, ${PKG}.tar.gz"
