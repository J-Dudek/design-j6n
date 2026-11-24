#!/usr/bin/env node
// Audit de contraste des associations de couleurs de la couche V3, dans les 4 combinaisons
// nature/moderne × clair/sombre. Lit les tokens de theme.css (oklch) et recalcule les
// mélanges color-mix(in oklab) tels que les écrit la feuille. Seuils : 4.5:1 texte, 3:1 non-texte.
// Usage : node scripts/contrast.mjs   (code de sortie 1 si une paire échoue)
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../theme.css', import.meta.url), 'utf8');

function block(selector) {
  // Toutes les déclarations « selector { … } » en début de ligne, fusionnées : le même sélecteur
  // peut apparaître plusieurs fois (ex. [data-theme='dark'] pour color-scheme, puis pour les tokens).
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tokens = {};
  let found = false;
  for (const m of css.matchAll(new RegExp('^' + escaped + '\\s*\\{([^}]*)\\}', 'gm'))) {
    for (const t of m[1].matchAll(/--j6n-([\w-]+):\s*(oklch\([^)]*\))/g)) { tokens[t[1]] = t[2]; found = true; }
  }
  if (!found) throw new Error('aucun token pour : ' + selector);
  return tokens;
}
const nature = block(':root');
const natureDark = { ...nature, ...block("[data-theme='dark']") };
const moderne = { ...nature, ...block("[data-j6n-theme='moderne']") };
const moderneDark = { ...moderne, ...block("[data-j6n-theme='moderne'][data-theme='dark']") };
const themes = { 'nature clair': nature, 'nature sombre': natureDark, 'moderne clair': moderne, 'moderne sombre': moderneDark };

function parse(str) {
  const m = str.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)/);
  const [L, C, h] = [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])];
  const a = C * Math.cos(h * Math.PI / 180), b = C * Math.sin(h * Math.PI / 180);
  return { L, a, b };
}
function toLinear({ L, a, b }) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  const c = (x) => Math.min(1, Math.max(0, x));
  return [
    c(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    c(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    c(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)
  ];
}
const lum = (col) => { const [r, g, b] = toLinear(col); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (x, y) => { const [hi, lo] = [lum(x), lum(y)].sort((p, q) => q - p); return (hi + 0.05) / (lo + 0.05); };
// color-mix(in oklab, A p%, B) — interpolation linéaire dans Oklab
const mix = (x, p, y) => ({ L: x.L * p + y.L * (1 - p), a: x.a * p + y.a * (1 - p), b: x.b * p + y.b * (1 - p) });
// Superposition d'un blanc à alpha sur un fond (reflet des boutons) : interpolation en espace linéaire
function overlayWhite(bg, alpha) {
  const lin = toLinear(bg).map((v) => v * (1 - alpha) + alpha);
  const l = Math.cbrt(0.4122214708 * lin[0] + 0.5363325363 * lin[1] + 0.0514459929 * lin[2]);
  const m = Math.cbrt(0.2119034982 * lin[0] + 0.6806995451 * lin[1] + 0.1073969566 * lin[2]);
  const s = Math.cbrt(0.0883024619 * lin[0] + 0.2817188376 * lin[1] + 0.6299787005 * lin[2]);
  return { L: 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, a: 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, b: 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s };
}

// Le reflet s'éteint à 40 % de la hauteur ; le texte d'un bouton (44 px, ligne de 14 px) commence vers 30 % → il reste 25 % de l'opacité.
const sheen = parseFloat(css.match(/--j6n-sheen-alpha:\s*([\d.]+)/)[1]) * 0.25;
let failures = 0;
for (const [name, t] of Object.entries(themes)) {
  const c = (k) => parse(t[k]);
  const checks = [
    // [libellé, premier plan, fond, seuil]
    ['texte / surface', c('text'), c('surface'), 4.5],
    ['texte atténué / carte (dégradé, fin)', c('text-muted'), mix(c('surface'), 0.94, c('accent-soft')), 4.5],
    ['texte atténué / état vide', c('text-muted'), mix(mix(c('accent-soft'), 0.25, c('surface')), 1, c('surface')), 4.5],
    ['texte / callout (dégradé)', c('text'), mix(c('accent-soft'), 0.55, c('surface-2')), 4.5],
    ['texte atténué / callout (dégradé)', c('text-muted'), mix(c('accent-soft'), 0.55, c('surface-2')), 4.5],
    ['texte / champ au survol', c('text'), mix(c('accent-soft'), 0.35, c('surface')), 4.5],
    ['lien accent-strong / surface', c('accent-strong'), c('surface'), 4.5],
    ['bouton : texte inversé / accent', c('text-invert'), c('accent'), 4.5],
    [`bouton : texte inversé / accent + reflet ${(sheen * 100).toFixed(0)} % au bord du texte`, c('text-invert'), overlayWhite(c('accent'), sheen), 4.5],
    ['avatar : accent-strong / accent-soft', c('accent-strong'), c('accent-soft'), 4.5],
    ['barre de progression : accent / piste', c('accent'), c('surface-2'), 3],
    ['étoile (notation) : warning / surface', c('warning'), c('surface'), 3],
    ['étoile vide : bordure interactive / surface', c('border-interactive'), c('surface'), 3],
    ['chronologie : repère / surface', c('border-interactive'), c('surface'), 3],
    ['champ OTP : bordure interactive / surface', c('border-interactive'), c('surface'), 3]
  ];
  for (const [label, fg, bg, min] of checks) {
    const r = ratio(fg, bg);
    const ok = r >= min;
    if (!ok) failures++;
    if (!ok || process.argv.includes('--all')) console.log(`${ok ? 'OK  ' : 'ÉCHEC'} ${name.padEnd(14)} ${label.padEnd(48)} ${r.toFixed(2)}:1 (min ${min})`);
  }
}
console.log(failures ? `\n${failures} paire(s) sous le seuil.` : 'Contrastes V3 : toutes les paires passent.');
process.exit(failures ? 1 : 0);
