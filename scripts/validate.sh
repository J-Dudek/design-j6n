#!/usr/bin/env bash
# Vérifications statiques de design-j6n — pas de suite de tests, le projet
# n'a ni framework ni build. Utilisé en local et par .github/workflows/ci.yml
# (à chaque push/PR) et release.yml (avant de publier un paquet sur un tag).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== Syntaxe JS =="
node --check theme.js
node --check demo/showcase.js
echo "OK"

echo
echo "== Outil de migration (npx design-j6n migrate) =="
node --check bin/design-j6n.mjs
# la démo et la page 404 sont à jour : l'outil ne doit rien y trouver
node bin/design-j6n.mjs migrate . --check > /dev/null || { node bin/design-j6n.mjs migrate .; exit 1; }
echo "OK"

echo
echo "== theme.js se charge sans DOM (rendu côté serveur) =="
node -e "require('./theme.js')"
echo "OK"

echo
echo "== Polices déclarées dans fonts.css présentes dans fonts/ =="
missing=0
for f in $(grep -o "url('fonts/[^']*')" fonts.css | sed "s/url('//; s/')//"); do
  [ -f "$f" ] || { echo "manquant : $f"; missing=1; }
done
[ "$missing" = 0 ] || exit 1
echo "OK"

echo
echo "== Champ version du JSON-LD (réécrit au déploiement par stamp-version.sh) =="
count=$(grep -c '"version": "' demo/index.html || true)
if [ "$count" != "1" ]; then
  echo "demo/index.html : $count champ(s) \"version\", 1 attendu — le déploiement Netlify échouerait."
  exit 1
fi
echo "OK"

echo
echo "== Équilibre des accolades CSS =="
python3 - <<'EOF'
import sys
for path in ("theme.css", "demo/showcase.css"):
    css = open(path, encoding="utf-8").read()
    balance = css.count("{") - css.count("}")
    status = "OK" if balance == 0 else f"DÉSÉQUILIBRE ({balance})"
    print(f"{path}: {status}")
    if balance != 0:
        sys.exit(1)
EOF

echo
echo "== HTML des pages de démo =="
python3 - <<'EOF'
import glob, html.parser, sys

ok = True
for f in sorted(glob.glob("demo/*.html")):
    errors = []

    class Checker(html.parser.HTMLParser):
        def error(self, message):
            errors.append(message)

    Checker().feed(open(f, encoding="utf-8").read())
    if errors:
        ok = False
        print(f"{f}: {errors}")
    else:
        print(f"{f}: OK")
sys.exit(0 if ok else 1)
EOF

echo
echo "== Classes .j6n-* utilisées dans la démo mais absentes de theme.css/showcase.css =="
python3 - <<'EOF'
import re, glob, sys

css = open("theme.css", encoding="utf-8").read() + open("demo/showcase.css", encoding="utf-8").read()
used = set()
for f in glob.glob("demo/*.html"):
    text = open(f, encoding="utf-8").read()
    for m in re.finditer(r'class="([^"]+)"', text):
        used.update(c for c in m.group(1).split() if c.startswith("j6n-"))

missing = [c for c in sorted(used) if not re.search(r"\." + re.escape(c) + r"(?![\w-])", css)]
if missing:
    print("manquantes:", missing)
    sys.exit(1)
print(f"OK — {len(used)} classes vérifiées")
EOF

echo
echo "== Références d'id (for/aria-*/popovertarget/href#) internes à chaque page =="
python3 - <<'EOF'
import re, glob, sys

ok = True
for f in sorted(glob.glob("demo/*.html")):
    text = open(f, encoding="utf-8").read()
    ids = set(re.findall(r'\bid="([^"]+)"', text))
    refs = set()
    for attr in ("for", "aria-controls", "aria-labelledby", "aria-describedby",
                 "popovertarget", "data-j6n-modal-open", "data-j6n-dismiss-target"):
        refs |= set(re.findall(rf'{attr}="([^"]+)"', text))
    refs |= set(re.findall(r'href="#([^"]+)"', text))
    refs.discard("")
    # aria-describedby et similaires peuvent lister plusieurs id séparés par des espaces
    refs = {r for group in refs for r in group.split()}
    missing = sorted(r for r in refs if r not in ids)
    dups = sorted({i for i in ids if text.count(f'id="{i}"') > 1})
    if missing or dups:
        ok = False
        print(f"{f}: manquants={missing} doublons={dups}")
    else:
        print(f"{f}: OK")
sys.exit(0 if ok else 1)
EOF

echo
echo "Tout est bon."
