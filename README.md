# design-j6n

Design system personnel — **Foulée**. Nature et trail pour les couleurs, vert terminal pour l'énergie.
Un seul fichier CSS, aucune dépendance, aucun build. Utilisable en HTML statique, Angular ou React.

- Préfixe : `--j6n-*` pour les variables, `.j6n-*` pour les classes
- Typographie : [Sora](https://fonts.google.com/specimen/Sora) + [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono)
- Thème clair et sombre, à parité
- Couleurs en `oklch()` (Chrome/Edge 111+, Safari 15.4+, Firefox 113+)

## Installation

Copier `theme.css` dans le projet. Les polices sont importées par le fichier lui-même.

### HTML statique

```html
<link rel="stylesheet" href="theme.css">
```

### Angular

```jsonc
// angular.json → architect.build.options
"styles": ["src/theme.css", "src/styles.css"]
```

### React / Vite / CRA

```js
// main.jsx ou index.js
import './theme.css';
```

## Thème sombre

Sans rien faire, le thème suit `prefers-color-scheme`. Pour forcer un mode, poser l'attribut sur `<html>` :

```js
document.documentElement.dataset.theme = 'dark'; // ou 'light'
```

## Tokens

| Groupe | Variables |
| --- | --- |
| Marque | `--j6n-accent`, `--j6n-accent-strong`, `--j6n-accent-soft`, `--j6n-pine`, `--j6n-pine-soft` |
| Sémantique | `--j6n-success`, `--j6n-warning`, `--j6n-danger`, `--j6n-info` |
| Surfaces | `--j6n-bg`, `--j6n-surface`, `--j6n-surface-2`, `--j6n-border`, `--j6n-border-strong` |
| Texte | `--j6n-text`, `--j6n-text-muted`, `--j6n-text-invert` |
| Typo | `--j6n-font-sans`, `--j6n-font-mono`, `--j6n-text-xs` → `--j6n-text-3xl` |
| Cadence | `--j6n-space-1` (4px) → `--j6n-space-9` (96px) |
| Formes | `--j6n-radius-sm` (4) · `-md` (8) · `-lg` (14) · `-pill` |
| Élévation | `--j6n-shadow-sm`, `--j6n-shadow-md`, `--j6n-ring` |
| Mouvement | `--j6n-ease`, `--j6n-dur-1` (120ms) · `-2` (220ms) · `-3` (420ms) |

## Composants

| Classe | Variantes |
| --- | --- |
| `.j6n-btn` | `--secondary` `--pine` `--ghost` `--sm` `--lg` `--block` |
| `.j6n-field` | avec `.j6n-label`, `.j6n-input`, `.j6n-select`, `.j6n-textarea`, `.j6n-hint`, `.j6n-check` |
| `.j6n-card` | `--interactive`, plus `.j6n-card__title`, `.j6n-card__meta` |
| `.j6n-stat` | `__value`, `__unit`, `__label` — chiffres tabulaires |
| `.j6n-header` | avec `.j6n-brand`, `.j6n-nav`, `.j6n-nav__link.is-active` |
| `.j6n-badge` | `--accent` `--pine` `--solid`, plus `.j6n-badge__dot` |
| `.j6n-alert` | `--success` `--warning` `--danger`, plus `.j6n-toast` |
| `.j6n-pre` | blocs de code, toujours sombres ; `.tok-key` `.tok-str` `.tok-com` |
| Utilitaires | `.j6n-container` `.j6n-stack` `.j6n-row` `.j6n-grid` `.j6n-eyebrow` `.j6n-muted` `.j6n-mono` `.j6n-divider-run` `.j6n-skeleton` |

## Exemple

```html
<main class="j6n-container j6n-stack">
  <p class="j6n-eyebrow">Dernière sortie</p>
  <article class="j6n-card j6n-card--interactive">
    <p class="j6n-card__meta">SAM. 29 AOÛT · 07:12</p>
    <h3 class="j6n-card__title">Crête des Ayes</h3>
    <div class="j6n-stat">
      <span class="j6n-stat__value">18,4<span class="j6n-stat__unit"> km</span></span>
      <span class="j6n-stat__label">Distance</span>
    </div>
    <span class="j6n-badge j6n-badge--pine">Sentier</span>
  </article>
  <button class="j6n-btn">Enregistrer</button>
</main>
```

`demo/index.html` reprend l'essentiel des composants ; ouvrir le fichier directement dans un navigateur.

## Règles

À faire :
- passer par les variables `--j6n-*`, jamais de valeur en dur ;
- un seul usage de l'accent par écran, réservé à l'action principale ;
- cibles tactiles à 44 px minimum ;
- `--j6n-font-mono` pour les valeurs mesurées, les libellés en petites capitales et le code.

À éviter :
- dégradés de fond et ombres floues ;
- le mono pour du texte courant ;
- des px hors de l'échelle de cadence.

## Licence

MIT.
