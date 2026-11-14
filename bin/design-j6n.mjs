#!/usr/bin/env node
/* ============================================================
   design-j6n — outil en ligne de commande
   npx design-j6n migrate [dossier] [--write] [--check]

   migrate : passage de la 0.1.x à la 0.2. Analyse les fichiers du
   projet (HTML, JSX/TSX, Vue, Svelte, templates Angular, CSS/SCSS,
   angular.json) et :
     - sans option : liste ce qui doit changer, fichier:ligne ;
     - --write    : applique les corrections sûres, copie fonts.css et
                    fonts/ à côté des copies locales de theme.css ;
     - --check    : code de sortie 1 s'il reste quelque chose à faire (CI).
   Ce qui demande un jugement (structure HTML à revoir) est seulement
   signalé, jamais réécrit.
   Aucune dépendance, Node 18+.
   ============================================================ */
import { readFileSync, writeFileSync, readdirSync, existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve, relative, extname, basename, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PKG = JSON.parse(readFileSync(join(PKG_DIR, 'package.json'), 'utf8'));
const OWN_BIN = join(PKG_DIR, 'bin');
// Version visée par la migration (indépendante du numéro du paquet installé).
const TARGET = '0.2';
const STYLE_EXTS = new Set(['.css', '.scss', '.sass', '.less']);

const EXTS = new Set(['.html', '.htm', '.jsx', '.tsx', '.js', '.ts', '.mjs', '.cjs', '.vue', '.svelte', '.astro',
  '.php', '.twig', '.njk', '.hbs', '.erb', '.liquid', '.css', '.scss', '.sass', '.less']);
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'out', 'coverage', 'vendor', 'tmp', 'target']);

/* ---------- Arguments ---------- */
const args = process.argv.slice(2);
const command = args[0];
const flags = new Set(args.filter(function (a) { return a.startsWith('--'); }));
const positional = args.slice(1).filter(function (a) { return !a.startsWith('--'); });

if (command !== 'migrate' || flags.has('--help')) {
  console.log([
    'design-j6n ' + PKG.version,
    '',
    'Usage : npx design-j6n migrate [dossier] [--write] [--check]',
    '',
    '  migrate     passage de la 0.1.x à la ' + TARGET + ' (polices, balisage, attributs)',
    '  --write     applique les corrections automatiques',
    '  --check     code de sortie 1 s\'il reste quelque chose à faire (CI)',
    '',
    'Sans --write, rien n\'est modifié.'
  ].join('\n'));
  process.exit(command === 'migrate' || flags.has('--help') || !command ? 0 : 1);
}

const WRITE = flags.has('--write');
const CHECK = flags.has('--check');
const ROOT = resolve(positional[0] || '.');

/* ---------- Utilitaires ---------- */
function walk(dir, out) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  entries.forEach(function (entry) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name) || full === OWN_BIN) return;
      walk(full, out);
    } else if (EXTS.has(extname(entry.name)) || entry.name === 'angular.json') {
      out.push(full);
    }
  });
  return out;
}
function lineOf(text, index) { return text.slice(0, index).split('\n').length; }
function indentAt(text, index) {
  const start = text.lastIndexOf('\n', index - 1) + 1;
  const m = /^[ \t]*/.exec(text.slice(start, index));
  return m ? m[0] : '';
}
function rel(file) { return relative(ROOT, file) || '.'; }
function read(file) { try { return readFileSync(file, 'utf8'); } catch (e) { return null; } }

const autoChanges = [];   // { file, line, msg }
const manual = [];        // { file, line, msg }
const infos = [];
const fontCopies = new Map(); // dossier → theme.css local
let filesChanged = 0;

/* Une référence à theme.css est-elle bien celle de design-j6n ?
   (un projet peut avoir son propre theme.css — on ne touche qu'aux nôtres) */
function resolveTheme(ref, fromDir, baseDirs) {
  if (/design-j6n/.test(ref)) {
    if (/^(https?:)?\/\//.test(ref)) return { kind: 'cdn' };
    return { kind: 'package' };
  }
  if (/^(https?:)?\/\//.test(ref) || /^data:/.test(ref)) return null;
  const clean = ref.split(/[?#]/)[0];
  const candidates = clean.startsWith('/')
    ? baseDirs.map(function (d) { return join(d, clean); })
    : [resolve(fromDir, clean)].concat(baseDirs.map(function (d) { return join(d, clean); }));
  for (let i = 0; i < candidates.length; i++) {
    const content = read(candidates[i]);
    if (content && content.indexOf('--j6n-') > -1) return { kind: 'local', path: candidates[i] };
  }
  return null;
}
const BASE_DIRS = [ROOT, join(ROOT, 'public'), join(ROOT, 'src'), join(ROOT, 'static'), join(ROOT, 'assets')];

/* ---------- Règles automatiques ---------- */

// 1. fonts.css avant theme.css (HTML, imports JS, @import CSS, angular.json)
function ruleFonts(file, src, changes) {
  if (src.indexOf('fonts.css') > -1) return src;
  const dir = dirname(file);
  const isAngular = basename(file) === 'angular.json';
  const ext = extname(file);
  const patterns = isAngular
    ? [/(["'])((?:[^"'\s]*\/)?)theme(?:\.min)?\.css\1/g]
    : ['.css', '.scss', '.sass', '.less'].indexOf(ext) > -1
      ? [/@import\s+(?:url\()?(["'])((?:[^"']*\/)?)theme(?:\.min)?\.css\1\)?[^;\n]*;?/g]
      : [
        /<link\b[^>]*\bhref=(["'])((?:[^"']*\/)?)theme(?:\.min)?\.css(?:[?#][^"']*)?\1[^>]*>/g,
        /import\s+(["'])((?:[^"']*\/)?)theme(?:\.min)?\.css\1\s*;?/g
      ];
  patterns.forEach(function (re) {
    src = src.replace(re, function (match, quote, prefix, offset, whole) {
      const ref = prefix + 'theme.css';
      if (isAngular && /"input"\s*:\s*$/.test(whole.slice(Math.max(0, offset - 40), offset))) {
        manual.push({ file: file, line: lineOf(whole, offset), msg: 'angular.json : ajouter une entrée pour fonts.css avant theme.css (forme objet "input", non modifiée automatiquement).' });
        return match;
      }
      const target = resolveTheme(ref, dir, BASE_DIRS.concat(isAngular ? [dir] : []));
      if (!target) return match;
      if (target.kind === 'cdn') {
        manual.push({ file: file, line: lineOf(whole, offset), msg: 'CDN : passer l\'URL en design-j6n@' + TARGET + '.x (version exacte) et ajouter …/fonts.css avant theme.css (fonts.css n\'existe pas dans les versions 0.1.x).' });
        return match;
      }
      if (target.kind === 'local') fontCopies.set(dirname(target.path), target.path);
      const line = lineOf(whole, offset);
      changes.push({ line: line, msg: 'ajout de ' + prefix + 'fonts.css avant theme.css (polices auto-hébergées)' });
      if (isAngular) return quote + prefix + 'fonts.css' + quote + ', ' + match;
      const indent = indentAt(whole, offset);
      if (re.source.indexOf('<link') === 0) return '<link rel="stylesheet" href="' + prefix + 'fonts.css">\n' + indent + match;
      if (re.source.indexOf('@import') === 0) return '@import ' + quote + prefix + 'fonts.css' + quote + ';\n' + indent + match;
      return 'import ' + quote + prefix + 'fonts.css' + quote + ';\n' + indent + match;
    });
  });
  return src;
}

// 2. aria-haspopup="true" sur les déclencheurs de popover (motif disclosure)
function ruleHaspopup(file, src, changes) {
  return src.replace(/<[a-zA-Z][\w.:-]*\b[^>]*?popovertarget[^>]*>/gi, function (tag, offset, whole) {
    const next = tag.replace(/\s+aria-haspopup=(?:"true"|'true'|\{true\}|\{"true"\}|\{'true'\})/, '');
    if (next !== tag) changes.push({ line: lineOf(whole, offset), msg: 'retrait de aria-haspopup="true" (menu déroulant = bouton qui affiche un panneau, pas un menu ARIA)' });
    return next;
  });
}

// 3. aria-pressed sur le bouton afficher/masquer du mot de passe
function rulePasswordPressed(file, src, changes) {
  return src.replace(/<[a-zA-Z][\w.:-]*\b[^>]*\bdata-j6n-password-toggle\b[^>]*>/g, function (tag, offset, whole) {
    const next = tag.replace(/\s+aria-pressed=(?:"(?:true|false)"|'(?:true|false)'|\{(?:true|false)\})/, '');
    if (next !== tag) changes.push({ line: lineOf(whole, offset), msg: 'retrait de aria-pressed sur data-j6n-password-toggle (le libellé Afficher/Masquer suffit)' });
    return next;
  });
}

// 4. onclick inline de la démo d'import → data-j6n-upload-trigger
function ruleUploadTrigger(file, src, changes) {
  return src.replace(/onclick=(["'])this\.closest\((["'])\.j6n-upload\2\)\.querySelector\((["'])input\3\)\.click\(\)\1/g, function (m, q, q2, q3, offset, whole) {
    changes.push({ line: lineOf(whole, offset), msg: 'onclick inline remplacé par data-j6n-upload-trigger' });
    return 'data-j6n-upload-trigger';
  });
}

// 5. valeur des boutons de consentement, déduite du libellé
function ruleConsentValue(file, src, changes) {
  return src.replace(/<button\b([^>]*\bdata-j6n-dismiss=(["'])[^"']*\2[^>]*)>([\s\S]*?)<\/button>/g, function (match, attrs, q, inner, offset, whole) {
    if (/data-j6n-dismiss-value/.test(attrs)) return match;
    const text = inner.replace(/<[^>]*>/g, ' ').trim();
    let value = null;
    if (/^(tout\s+)?accept|^j'accepte|^ok\b|^allow/i.test(text)) value = 'accepte';
    else if (/^(tout\s+)?refus|^decline|^reject|^deny/i.test(text)) value = 'refuse';
    if (!value) return match;
    changes.push({ line: lineOf(whole, offset), msg: 'data-j6n-dismiss-value="' + value + '" ajouté au bouton « ' + text + ' » (choix de consentement relu avec j6n.dismissed())' });
    return match.replace(/(\bdata-j6n-dismiss=(["'])[^"']*\2)/, '$1 data-j6n-dismiss-value="' + value + '"');
  });
}

// 6. role="switch" sur la case à cocher d'un interrupteur
function ruleToggleSwitch(file, src, changes) {
  return src.replace(/(<label\b[^>]*\bj6n-toggle\b[^>]*>\s*)(<input\b[^>]*>)/g, function (match, label, input, offset, whole) {
    if (/\brole=/.test(input) || !/\btype=(["'])checkbox\1/.test(input)) return match;
    changes.push({ line: lineOf(whole, offset), msg: 'role="switch" ajouté à l\'interrupteur (annoncé « interrupteur, activé »)' });
    return label + input.replace(/^<input\b/, '<input role="switch"');
  });
}

const AUTO_RULES = [ruleFonts, ruleHaspopup, rulePasswordPressed, ruleUploadTrigger, ruleConsentValue, ruleToggleSwitch];

/* ---------- Points à revoir à la main ---------- */
function manualChecks(file, src) {
  const name = basename(file);
  const ownCopy = (name === 'theme.css' && src.indexOf('--j6n-') > -1) || (name === 'theme.js' && src.indexOf('j6nBound') > -1);
  function add(re, msg, filter) {
    // balisage seulement : ni feuilles de style, ni copies de la bibliothèque elle-même
    if (STYLE_EXTS.has(extname(file)) || ownCopy) return;
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(src)) !== null) {
      if (!filter || filter(m)) manual.push({ file: file, line: lineOf(src, m.index), msg: msg });
    }
  }
  add(/<(?!ol\b)([a-z][\w-]*)\b[^>]*\bclass(?:Name)?=(["'])[^"']*\bj6n-stepper\b[^"']*\2/g,
    'étapes (.j6n-stepper) : passer à <ol>/<li>, aria-current="step" sur l\'étape en cours, état en texte masqué (<span class="j6n-sr-only"> (terminée)</span>). Modèle dans le README, section Navigation.');
  add(/<ul\b[^>]*\bj6n-pagination\b[^>]*>/g,
    'pagination : envelopper la <ul> dans <nav aria-label="Pagination"> (l\'aria-label sur la <ul> est mal restitué).',
    function (m) { return src.slice(Math.max(0, m.index - 250), m.index).search(/<nav\b/) === -1; });
  add(/<a\b(?=[^>]*\bis-disabled\b)(?=[^>]*\bhref=(["'])#\1)[^>]*>/g,
    'lien désactivé : retirer href="#" et ajouter role="link" aria-disabled="true" (sinon il reste activable et suivi par les robots).');
  add(/<blockquote\b[^>]*\bj6n-quote\b/g,
    'citation : <figure class="j6n-quote"><blockquote>…</blockquote><figcaption class="j6n-quote__cite">…</figcaption></figure> (l\'attribution sort de la citation).');
  add(/\bj6n-card--interactive\b/g,
    'carte interactive : mettre un lien .j6n-card__link dans le titre — sa zone couvre la carte (sinon la carte a l\'air cliquable sans l\'être).',
    function () { return src.indexOf('j6n-card__link') === -1; });
  add(/<(input|img|select|textarea)\b[^>]*\bdata-tooltip=/g,
    'infobulle sur un élément sans contenu possible (input, img…) : déplacer data-tooltip sur un conteneur ou un bouton.');
  add(/classList\.(?:add|toggle)\((["'])is-loading\1/g,
    'bouton en chargement : poser aussi aria-disabled="true" et aria-busy="true" (theme.js bloque alors les clics clavier).',
    function () { return !/aria-busy|aria-disabled/.test(src); });

  if (name === 'theme.css' && src.indexOf('--j6n-') > -1 && src.indexOf('fonts.googleapis.com') > -1) {
    manual.push({ file: file, line: 1, msg: 'copie locale de theme.css antérieure à la ' + TARGET + ' : la remplacer par la nouvelle version (elle importe encore Google Fonts). Source : ' + join(PKG_DIR, 'theme.css') });
  }
  if (name === 'theme.js' && src.indexOf('j6nBound') > -1 && src.indexOf('destroy') === -1) {
    manual.push({ file: file, line: 1, msg: 'copie locale de theme.js antérieure à la ' + TARGET + ' : la remplacer par la nouvelle version. Source : ' + join(PKG_DIR, 'theme.js') });
  }
}

/* ---------- Copie des polices à côté des copies locales de theme.css ---------- */
function copyFonts(dir) {
  const files = ['fonts.css'];
  readdirSync(join(PKG_DIR, 'fonts')).forEach(function (f) { files.push(join('fonts', f)); });
  mkdirSync(join(dir, 'fonts'), { recursive: true });
  files.forEach(function (f) {
    const to = join(dir, f);
    if (!existsSync(to)) copyFileSync(join(PKG_DIR, f), to);
  });
}

/* ---------- Analyse ---------- */
const files = walk(ROOT, []).filter(function (f) { return !f.startsWith(OWN_BIN + sep); });
files.forEach(function (file) {
  const original = read(file);
  if (original === null) return;
  if (original.indexOf('j6n') === -1 && !/theme(\.min)?\.css/.test(original)) return;
  let src = original;
  const changes = [];
  AUTO_RULES.forEach(function (rule) { src = rule(file, src, changes); });
  manualChecks(file, original);
  if (changes.length) {
    changes.forEach(function (c) { autoChanges.push({ file: file, line: c.line, msg: c.msg }); });
    if (WRITE && src !== original) { writeFileSync(file, src); filesChanged++; }
  }
});

const pendingCopies = [];
fontCopies.forEach(function (themePath, dir) {
  if (existsSync(join(dir, 'fonts.css'))) return;
  pendingCopies.push(dir);
  if (WRITE) copyFonts(dir);
});

const pkgJson = read(join(ROOT, 'package.json'));
if (pkgJson && /"(react|vue|svelte|@angular\/core|solid-js|preact)"\s*:/.test(pkgJson)) {
  infos.push('Application à rendu côté client détectée : appelez j6n.destroy() après chaque changement de route (ou j6n.destroy(conteneur) au démontage) pour libérer écouteurs et minuteries.');
}

/* ---------- Rapport ---------- */
function print(list) {
  list.sort(function (a, b) { return a.file === b.file ? a.line - b.line : a.file < b.file ? -1 : 1; });
  list.forEach(function (item) { console.log('  ' + rel(item.file) + ':' + item.line + '  ' + item.msg); });
}

console.log('design-j6n ' + PKG.version + ' — migration 0.1.x → ' + TARGET);
console.log(files.length + ' fichier(s) analysé(s) dans ' + ROOT + '\n');

if (autoChanges.length) {
  console.log(WRITE ? 'Corrigé automatiquement :' : 'Corrections automatiques disponibles (relancer avec --write) :');
  print(autoChanges);
  console.log('');
}
if (pendingCopies.length) {
  console.log(WRITE ? 'Polices copiées (fonts.css + fonts/) :' : 'Polices à copier à côté de vos copies de theme.css (fait par --write) :');
  pendingCopies.forEach(function (d) { console.log('  ' + rel(d) + sep + 'fonts.css, ' + rel(d) + sep + 'fonts' + sep); });
  console.log('');
}
if (manual.length) {
  console.log('À faire à la main :');
  print(manual);
  console.log('');
}
infos.forEach(function (i) { console.log('Info : ' + i + '\n'); });

const remaining = (WRITE ? 0 : autoChanges.length + pendingCopies.length) + manual.length;
if (!autoChanges.length && !pendingCopies.length && !manual.length) {
  console.log('Rien à migrer.');
} else if (WRITE) {
  console.log(filesChanged + ' fichier(s) modifié(s).' + (manual.length ? ' ' + manual.length + ' point(s) restent à revoir à la main.' : ''));
}
if (CHECK && remaining > 0) process.exit(1);
