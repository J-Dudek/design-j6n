#!/usr/bin/env bash
# Recopie la version de package.json dans les données structurées (JSON-LD) de
# demo/index.html. Lancé par Netlify à chaque déploiement (netlify.toml →
# [build] command) : la page publiée suit toujours package.json, sans retouche
# à la main. La valeur écrite dans le dépôt n'est qu'un point de départ.
#
# Utilisable en local pour aligner le fichier : bash scripts/stamp-version.sh
# Échoue (et fait donc échouer le déploiement) si le champ est introuvable,
# plutôt que de publier une version périmée sans rien dire.
set -euo pipefail
cd "$(dirname "$0")/.."

node - <<'EOF'
const fs = require('fs');

const version = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
const file = 'demo/index.html';
const src = fs.readFileSync(file, 'utf8');
const pattern = /"version": "[^"]*"/g;

const matches = src.match(pattern) || [];
if (matches.length !== 1) {
  console.error(`${file} : ${matches.length} champ(s) "version" trouvé(s) dans le JSON-LD, 1 attendu.`);
  process.exit(1);
}

fs.writeFileSync(file, src.replace(pattern, `"version": "${version}"`));
console.log(`${file} : version ${version}`);
EOF
