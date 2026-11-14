#!/usr/bin/env bash
# Assemble le paquet téléchargeable (theme.css + theme.js, leurs versions
# minifiées, les polices, README + LICENCE) publié en pièce jointe de la
# Release GitHub à chaque tag. Les fichiers .min sont aussi laissés à la
# racine : release.yml enchaîne avec npm publish, qui les embarque (voir
# "files" dans package.json). Utilisable en local pour vérifier le contenu
# avant de taguer :
#   VERSION=0.0.0-test scripts/package.sh
#
# Minification par esbuild, version figée, récupérée par npx au moment du
# paquet : le projet lui-même reste sans dépendance ni build.
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION="${VERSION:-}"
if [ -z "$VERSION" ]; then
  VERSION="${GITHUB_REF_NAME:-0.0.0-local}"
  VERSION="${VERSION#v}"
fi
PKG="foulee-${VERSION}"

ESBUILD="npx --yes esbuild@0.25.10"
$ESBUILD theme.css --minify --outfile=theme.min.css --log-level=warning
$ESBUILD theme.js --minify --outfile=theme.min.js --log-level=warning

rm -rf "$PKG" "${PKG}.zip" "${PKG}.tar.gz"
mkdir "$PKG"
cp theme.css theme.js theme.min.css theme.min.js theme.d.ts fonts.css README.md LICENSE "$PKG"/
cp -r fonts "$PKG"/

zip -r "${PKG}.zip" "$PKG" > /dev/null
tar -czf "${PKG}.tar.gz" "$PKG"

echo "PKG=${PKG}" >> "${GITHUB_ENV:-/dev/null}"
echo "Paquet prêt : ${PKG}.zip, ${PKG}.tar.gz"
