# design-j6n

Design system personnel — **Foulée**. Nature et trail pour les couleurs, vert terminal pour l'énergie.
Deux fichiers (`theme.css` + `theme.js`), plus `fonts.css` facultatif pour les polices auto-hébergées ; aucune dépendance, aucun build. Utilisable en HTML statique, Angular ou React.
Deux thèmes visuels partagent les mêmes composants : **nature** (par défaut) et **moderne** (gris/bleu) — voir [Thèmes](#thèmes).

- Préfixe : `--j6n-*` pour les variables, `.j6n-*` pour les classes, `data-j6n-*` pour les hooks JS
- Typographie : [Sora](https://fonts.google.com/specimen/Sora) + [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono)
- Thème clair et sombre, à parité
- Couleurs en `oklch()` (Chrome/Edge 111+, Safari 15.4+, Firefox 113+)
- `theme.js` s'appuie sur les éléments natifs (`<details>`, `<dialog>`, Popover API) plutôt que de réimplémenter le comportement en JS — fonctionne sans lui pour l'accordéon et la modale, requis pour les onglets, le menu déroulant, le combobox et les bandeaux mémorisés

## Installation

Via npm :

```sh
npm install design-j6n
```

Ou copier `fonts.css` + le dossier `fonts/` (polices), `theme.css` (styles) et `theme.js` (comportements) directement dans le projet.

| Fichier | Rôle |
| --- | --- |
| `fonts.css` + `fonts/` | polices auto-hébergées (Sora, IBM Plex Mono ; Inter et JetBrains Mono pour le thème moderne), sous-ensemble latin, ~155 Ko au total dont seules les familles utilisées sont téléchargées. Facultatif : sans lui, repli sur les polices système |
| `theme.css` / `theme.min.css` | tokens + composants (version minifiée : ~10 Ko compressé) |
| `theme.js` / `theme.min.js` | comportements (version minifiée : ~8 Ko compressé) |
| `theme.d.ts` | types TypeScript de `window.j6n` |

Les polices ne viennent plus de Google Fonts : aucune requête vers un serveur tiers (pas de transfert d'adresse IP des visiteurs, sujet sensible au regard du RGPD), pas de chaîne de requêtes avant l'affichage du texte.

### HTML statique

```html
<link rel="preload" href="fonts/sora-latin-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="fonts.css">
<link rel="stylesheet" href="theme.css">
<script src="theme.js" defer></script>
```

Le `preload` de Sora (police du texte courant) est facultatif mais accélère le premier affichage. `defer` permet de placer le script dans le `<head>` : il s'active une fois le HTML lu.

Via CDN (sans npm) : `https://cdn.jsdelivr.net/npm/design-j6n@<version>/theme.min.css`, `…/theme.min.js` et `…/fonts.css` — toujours avec une version exacte.

### Angular

```jsonc
// angular.json → architect.build.options
"styles": ["node_modules/design-j6n/fonts.css", "node_modules/design-j6n/theme.css", "src/styles.css"],
"scripts": ["node_modules/design-j6n/theme.js"]
```

### React / Vite / CRA

```js
// main.jsx ou index.js
import 'design-j6n/fonts.css';
import 'design-j6n/theme.css';
import 'design-j6n';             // theme.js : s'exécute à l'import et expose window.j6n
```

### SPA (React, Angular, Vue…) et rendu côté serveur

- **Contenu ajouté après le chargement** (composant monté plus tard) : `j6n.init(monConteneur)` active les comportements sur ce sous-arbre.
- **Contenu retiré** (changement de route, démontage) : `j6n.destroy(monConteneur)` retire écouteurs, minuteries (carrousel) et observateurs. `j6n.destroy()` sans argument nettoie tous les composants qui ne sont plus dans la page — pratique après chaque navigation. Sans cela, les écouteurs posés sur `document` s'accumulent.
- **Rendu côté serveur** (Next.js, Angular SSR, Nuxt) : `theme.js` ne fait rien quand `window`/`document` n'existent pas ; l'importer reste sans risque. Les comportements s'activent côté navigateur.

### Intégration dans un projet existant

Les styles appliqués aux éléments HTML nus (`body`, titres, `p`, `a`, `hr`, `code`) sont dans une couche `@layer j6n-base` : n'importe quelle règle de votre projet hors couche l'emporte sur eux, quelle que soit sa spécificité. Les composants `.j6n-*` restent hors couche.

### Migration depuis 0.1.x

Un outil fourni avec le paquet repère tout ce qui change, fichier par fichier, et corrige ce qui peut l'être sans risque :

```sh
npx design-j6n migrate            # analyse seule : rien n'est modifié
npx design-j6n migrate --write    # applique les corrections automatiques
npx design-j6n migrate --check    # en CI : code de sortie 1 s'il reste quelque chose
npx design-j6n@0.2 migrate        # sans npm (fichiers copiés à la main) : télécharge l'outil
```

Il analyse HTML, JSX/TSX, Vue, Svelte, templates Angular, CSS/SCSS et `angular.json` (hors `node_modules`, `dist`, `build` et dossiers cachés) :

| Corrigé par `--write` | Signalé, à revoir à la main |
| --- | --- |
| `fonts.css` ajouté avant chaque `theme.css` (`<link>`, `import`, `@import`, `angular.json`) | copies locales de `theme.css` / `theme.js` antérieures à la 0.2 (à remplacer) |
| `fonts.css` + `fonts/` copiés à côté des copies locales de `theme.css` | URL CDN à passer en 0.2 |
| `aria-haspopup="true"` retiré des déclencheurs popover | étapes à passer en `<ol>` |
| `aria-pressed` retiré du bouton afficher/masquer le mot de passe | pagination à placer dans une `<nav>`, liens désactivés en `href="#"` |
| `onclick` d'import remplacé par `data-j6n-upload-trigger` | citation à passer en `<figure>` |
| `data-j6n-dismiss-value` ajouté aux boutons « Accepter » / « Refuser » | carte interactive sans `.j6n-card__link` |
| `role="switch"` ajouté aux interrupteurs | bouton `.is-loading` sans `aria-disabled` / `aria-busy`, infobulle sur un `input` |

Seuls les `theme.css` de design-j6n sont touchés (référence au paquet, ou fichier contenant ses variables `--j6n-*`) : un `theme.css` propre au projet est ignoré.

Dans le navigateur, `theme.js` signale aussi en console (`[j6n] Usage antérieur à la 0.2 détecté`) les cas qu'il repère sur la page — polices absentes, ancien balisage — en renvoyant vers cette commande. Si les polices système sont voulues, `<html data-j6n-quiet>` fait taire le message.

Ce qui change :

- **Polices** : `theme.css` n'importe plus Google Fonts. Ajoutez `fonts.css` (voir plus haut), sinon le texte s'affiche en police système.
- **Menu déroulant** : `theme.js` ne pose plus `aria-haspopup="true"` (qui promettait un vrai menu ARIA, avec flèches et `role="menuitem"`). Retirez-le de votre balisage si vous l'aviez copié de la démo.
- **Toast** : 6 s par défaut au lieu de 4, en pause tant que la souris ou le focus y est ; `tone: 'danger'` reste affiché jusqu'à fermeture.
- **Consentement** : ajoutez `data-j6n-dismiss-value="accepte"` / `"refuse"` à chaque bouton pour distinguer le choix (lu avec `j6n.dismissed('clé')`).
- **Étapes** et **pagination** : nouveau balisage, voir [Navigation](#navigation).

## Thème sombre

Sans rien faire, le thème suit `prefers-color-scheme`. Pour forcer un mode, poser l'attribut sur `<html>` :

```js
document.documentElement.dataset.theme = 'dark'; // ou 'light'
```

## Thèmes

Deux thèmes visuels, mêmes composants et mêmes classes `.j6n-*` — seuls les tokens
(couleurs + polices) changent. Par défaut : **nature** (vert terrain, Sora + IBM Plex
Mono). Pour passer au thème **moderne** (bleu/gris, Inter + JetBrains Mono), poser
l'attribut sur `<html>` :

```js
document.documentElement.dataset.j6nTheme = 'moderne'; // ou retirer l'attribut pour revenir à nature
```

```html
<html data-j6n-theme="moderne">
```

Se combine librement avec `data-theme` (clair/sombre/auto) — les deux attributs sont
indépendants, donc les quatre combinaisons (nature clair/sombre, moderne clair/sombre)
fonctionnent, y compris `prefers-color-scheme` sans `data-theme` explicite. Les couleurs
sémantiques (succès/attention/erreur) et les couleurs de marque tierce (`.j6n-connect`)
restent identiques d'un thème à l'autre ; chaque token du thème moderne a été vérifié au
même seuil WCAG que nature (4.5:1 texte, 3:1 frontière fonctionnelle).

## Tokens

| Groupe | Variables |
| --- | --- |
| Marque | `--j6n-accent`, `--j6n-accent-strong`, `--j6n-accent-soft`, `--j6n-pine`, `--j6n-pine-soft` |
| Sémantique | `--j6n-success`, `--j6n-warning`, `--j6n-danger`, `--j6n-info` |
| Surfaces | `--j6n-bg`, `--j6n-surface`, `--j6n-surface-2`, `--j6n-border`, `--j6n-border-strong` (décoratif), `--j6n-border-interactive` (3:1 garanti — champ, tag, tuile de choix, piste d'interrupteur…) |
| Texte | `--j6n-text`, `--j6n-text-muted`, `--j6n-text-invert` |
| Typo | `--j6n-font-sans`, `--j6n-font-mono`, `--j6n-text-xs` → `--j6n-text-3xl` |
| Cadence | `--j6n-space-1` (4px) → `--j6n-space-9` (96px) |
| Formes | `--j6n-radius-sm` (4) · `-md` (8) · `-lg` (14) · `-pill` |
| Élévation | `--j6n-shadow-sm`, `--j6n-shadow-md`, `--j6n-ring` |
| Mouvement | `--j6n-ease`, `--j6n-dur-1` (120ms) · `-2` (220ms) · `-3` (420ms) |

## Espacements (padding, margin, gap)

Tous les espacements passent par l'échelle de cadence : en classes utilitaires directement dans le HTML, ou en variables dans votre CSS.

| Token | Valeur | Usage typique dans le thème |
| --- | --- | --- |
| `--j6n-space-1` | 4px | écart entre une valeur et son libellé, entre les liens de navigation ou les onglets |
| `--j6n-space-2` | 8px | petits écarts internes : icône et texte, padding vertical des petits éléments |
| `--j6n-space-3` | 12px | écart entre éléments en ligne (`.j6n-row`), marge sous les titres, gap du header sur mobile |
| `--j6n-space-4` | 16px | écart entre blocs empilés (`.j6n-stack`), marge sous les paragraphes, padding des alertes |
| `--j6n-space-5` | 24px | marges latérales de `.j6n-container`, padding des cartes et des modales, gap de `.j6n-grid` |
| `--j6n-space-6` | 32px | gap du header sur ordinateur, padding des grandes zones (import de fichiers) |
| `--j6n-space-7` | 48px | séparation entre sections : gap de `.j6n-layout`, marges de `<hr>`, padding du footer |
| `--j6n-space-8` | 64px | marge au-dessus du footer, grands blocs de page |
| `--j6n-space-9` | 96px | réservé aux très grandes respirations (sections de page d'accueil) |

### Classes utilitaires

Le chiffre de la classe est celui du token : `.j6n-mt-4` applique `margin-top: var(--j6n-space-4)`. Chaque classe existe de `0` (annule l'espacement) à `9`, plus `auto` pour les marges. La documentation complète, avec démonstrations visuelles, est dans `demo/espacements.html`.

| Préfixe | Propriété |
| --- | --- |
| `.j6n-m-*` | `margin` (les quatre côtés) |
| `.j6n-mt-*` / `.j6n-mb-*` | `margin-top` / `margin-bottom` |
| `.j6n-ml-*` / `.j6n-mr-*` | `margin-left` / `margin-right` (`.j6n-ml-auto` pousse à droite dans un flex) |
| `.j6n-mx-*` / `.j6n-my-*` | marges gauche + droite / haut + bas (`.j6n-mx-auto` pour centrer) |
| `.j6n-p-*` | `padding` (les quatre côtés) |
| `.j6n-pt-*` / `.j6n-pb-*` | `padding-top` / `padding-bottom` |
| `.j6n-pl-*` / `.j6n-pr-*` | `padding-left` / `padding-right` |
| `.j6n-px-*` / `.j6n-py-*` | padding gauche + droite / haut + bas |
| `.j6n-gap-*` | `gap` (écart entre les enfants d'un flex ou d'une grille) |

```html
<section class="j6n-py-7">
  <h2 class="j6n-mb-5">Dernières sorties</h2>
  <div class="j6n-row j6n-gap-5">…</div>
  <p class="j6n-muted j6n-mt-3 j6n-mb-0">Mis à jour ce matin</p>
</section>
```

Les utilitaires sont déclarés en fin de `theme.css` : ils remplacent l'espacement par défaut d'un composant (`.j6n-row j6n-gap-5`, `.j6n-footer j6n-mt-0`).

### Dans votre CSS

```css
.ma-carte {
  padding: var(--j6n-space-5);
  margin-bottom: var(--j6n-space-4);
  display: flex;
  gap: var(--j6n-space-3);
}
```

**Espacements déjà fournis par le thème :**
- `h1` à `h4` ont une marge basse de `--j6n-space-3`, les `<p>` de `--j6n-space-4` (et une largeur maximale de 68 caractères) ;
- les classes de mise en page portent leur propre écart : `.j6n-stack` (vertical, `--j6n-space-4`), `.j6n-row` (horizontal, `--j6n-space-3`), `.j6n-grid` (`--j6n-space-5`), `.j6n-layout` (`--j6n-space-7`) ;
- `.j6n-container` centre le contenu et ajoute `--j6n-space-5` de marge latérale.

Pour changer l'écart d'une de ces classes à un endroit précis, ajoutez un utilitaire : `<div class="j6n-stack j6n-gap-2">`.

## Composants

### Actions

| Classe | Variantes |
| --- | --- |
| `.j6n-btn` | `--secondary` `--pine` `--ghost` `--sm` `--lg` `--block` `--icon`, état `.is-loading` (spinner) — à accompagner de `aria-disabled="true"` et `aria-busy="true"` : `theme.js` bloque alors tout nouveau clic, clavier compris |
| `.j6n-segmented` | groupe de radios stylé, une seule sélection visible (contour ≥ 3:1 sur l'option choisie) |
| `.j6n-toggle` | interrupteur on/off (`__track`) — `role="switch"` sur la case à cocher pour l'annoncer « interrupteur » |
| `.j6n-tag` | étiquette filtrable, `.is-active`, `__remove` |

### Formulaires

| Classe | Variantes |
| --- | --- |
| `.j6n-field` | avec `.j6n-label`, `.j6n-input`, `.j6n-select`, `.j6n-textarea`, `.j6n-hint` (`--valid`/`--danger`), `.j6n-check`, `--icon` (+ `__icon`), `__count` |
| `.j6n-fieldset` / `.j6n-legend` | groupe de champs (radio/case à cocher) |
| `.j6n-choice-tile` | radio/case à cocher en tuile bordée, sélection via `:has()` |
| `.j6n-search` | champ + bouton fusionnés (`__input`, `__btn`) |
| `.j6n-password` | champ + bascule visibilité (`__toggle`, libellé « Afficher » / « Masquer », sans `aria-pressed`), `.j6n-password__meter` (force, annoncée quand elle change de palier) |
| `.j6n-range-field` / `.j6n-range` | curseur avec piste remplie et valeur affichée |
| `.j6n-upload` | zone de glisser-déposer, `.is-dragover`, `__list`/`__item`, bouton `data-j6n-upload-trigger` qui ouvre le sélecteur |
| `.j6n-combobox` | saisie avec suggestions filtrées (`__list`, `__option`, `__empty`) — nombre de résultats annoncé, fermeture en quittant le champ |

### Navigation

| Classe | Variantes |
| --- | --- |
| `.j6n-header` | avec `.j6n-brand`, `.j6n-nav`, `.j6n-nav__link.is-active`, `.j6n-nav__toggle` (menu mobile) |
| `.j6n-breadcrumb` | fil d'Ariane, `[aria-current="page"]` |
| `.j6n-tabs__list` / `__tab` / `__panel` | onglets accessibles (flèches clavier) |
| `.j6n-dropdown__menu` | menu déroulant (`popover` natif), `__item`, `__divider` — motif « disclosure » : `aria-expanded` et `aria-controls` posés par `theme.js`, pas d'`aria-haspopup` |
| `.j6n-sidemenu` | navigation verticale, `__link.is-active`, `__sublist` |
| `.j6n-toc` | sommaire à suivi de défilement |
| `.j6n-pagination` | `<ul>` dans un `<nav aria-label="Pagination">`, `[aria-current="page"]`, `.is-ellipsis`, `.is-disabled` |
| `.j6n-skiplink` | lien d'évitement, visible au focus |
| `.j6n-stepper` | étapes numérotées sur un `<ol>`, `.is-current` + `aria-current="step"`, `.is-done` — état écrit en texte masqué (`.j6n-sr-only`) |
| `.j6n-tile` | tuile de navigation, `--horizontal` |
| `.j6n-footer` | pied de page multi-colonnes (`__grid`, `__col`, `__bottom`) |

**Pagination.** Des liens réels (`href="?page=2"`) : les robots suivent les pages, et chaque page reste accessible sans JavaScript. La page impossible (« Précédent » sur la première) n'a pas de `href` :

```html
<nav aria-label="Pagination">
  <ul class="j6n-pagination">
    <li><a class="is-disabled" role="link" aria-disabled="true">← Précédent</a></li>
    <li><a href="?page=1" aria-current="page">1</a></li>
    <li><a href="?page=2">2</a></li>
    <li><a href="?page=2">Suivant →</a></li>
  </ul>
</nav>
```

**Étapes.** L'état de chaque étape est écrit, pas seulement dessiné (RGAA 3.1) :

```html
<ol class="j6n-stepper" aria-label="Publication de la sortie">
  <li class="j6n-stepper__step is-done"><span class="j6n-stepper__num">1</span><span class="j6n-stepper__label">Import<span class="j6n-sr-only"> (terminée)</span></span></li>
  <li class="j6n-stepper__step is-current" aria-current="step"><span class="j6n-stepper__num">2</span><span class="j6n-stepper__label">Publication<span class="j6n-sr-only"> (en cours)</span></span></li>
  <li class="j6n-stepper__step"><span class="j6n-stepper__num">3</span><span class="j6n-stepper__label">Partage<span class="j6n-sr-only"> (à venir)</span></span></li>
</ol>
```

**Fil d'Ariane et moteurs de recherche.** Le composant est accessible tel quel ; pour que Google l'affiche dans ses résultats, ajoutez le JSON-LD correspondant dans la page :

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Accueil", "item": "https://exemple.fr/" },
    { "@type": "ListItem", "position": 2, "name": "Sorties", "item": "https://exemple.fr/sorties/" },
    { "@type": "ListItem", "position": 3, "name": "Crête des Ayes" }
  ]
}
</script>
```

**Logo de la marque (facultatif).** Par défaut, `.j6n-brand` affiche un rond aux couleurs du thème (`.j6n-brand__mark`). Pour utiliser votre logo, dans le header comme dans le footer, remplacez ce `<span>` par une image :

```html
<!-- Par défaut -->
<a class="j6n-brand" href="/"><span class="j6n-brand__mark"></span> Foulée</a>

<!-- Avec un logo, suivi du nom : alt vide, le texte nomme déjà le lien -->
<a class="j6n-brand" href="/"><img class="j6n-brand__logo" src="logo.svg" alt=""> Foulée</a>

<!-- Logo seul, qui contient déjà le nom : alt obligatoire -->
<a class="j6n-brand" href="/"><img class="j6n-brand__logo" src="logo.svg" alt="Foulée — accueil"></a>
```

Le logo fait 28px de haut, avec une largeur libre (180px maximum), ce qui convient aux logos carrés comme horizontaux. Pour changer la hauteur : `--j6n-brand-logo-height: 36px;` sur `:root` ou sur un `.j6n-brand` précis.

### Retours

| Classe | Variantes |
| --- | --- |
| `dialog.j6n-modal` | modale (`<dialog>` natif), `__header`, `__body`, `__footer` |
| `[data-tooltip]` | infobulle, `data-tooltip-pos="bottom"` — `theme.js` en fait un élément relié par `aria-describedby` (lu comme description, pas ajouté au nom du bouton), survolable et masquable avec Échap (RGAA 10.13). À poser sur un élément qui peut avoir du contenu (bouton, lien, `span`), pas sur un `input` |
| `.j6n-notice` | bandeau pleine largeur, fermeture mémorisée |
| `.j6n-accordion` | `<details>` stylés, `__trigger`, `__panel` |
| `.j6n-callout` | mise en avant, `--pine` |
| `.j6n-consent` | bandeau de consentement générique, choix mémorisé (`data-j6n-dismiss-value`) |
| `.j6n-alert` | `--success` `--warning` `--danger`, `__close` |
| `.j6n-toast` | pile de toasts via l'API JS `j6n.toast()` — annoncés au lecteur d'écran, en pause au survol et au focus |

### Données & contenu

| Classe | Variantes |
| --- | --- |
| `.j6n-card` | `--interactive` (avec un `.j6n-card__link` dont la zone couvre la carte), plus `.j6n-card__title`, `.j6n-card__meta` |
| `.j6n-stat` | `__value`, `__unit`, `__label` — chiffres tabulaires |
| `.j6n-badge` | `--accent` `--pine` `--solid` `--success` `--warning` `--danger` `--info`, plus `.j6n-badge__dot` |
| `.j6n-table` | `.j6n-table-wrap` (zone de défilement focalisable, nommée par la légende — posé par `theme.js` si absent), `[data-numeric]`, `.j6n-table__sort` (tri au clic) |
| `.j6n-quote` | `<figure>` avec `<blockquote>` et `<figcaption class="j6n-quote__cite">` (l'attribution reste hors de la citation) |
| `.j6n-highlight` | mise en exergue de texte |
| `.j6n-download` | lien de téléchargement, `__ext`, `__name`, `__meta` |
| `.j6n-user-menu__trigger` | avatar + menu (réutilise `.j6n-dropdown__menu`) |
| `.j6n-connect` | connexion à un service externe, `--strava` `--garmin` |
| `.j6n-unit-switch` | bascule d'unités (réutilise `.j6n-segmented`) |
| `.j6n-pre` | blocs de code, toujours sombres ; `.tok-key` `.tok-str` `.tok-com` |
| `.j6n-carousel` | carrousel accessible : `__toolbar`, `__progress`, `__nav`, `__counter`, `__viewport`, `__track`, `__slide`, `__dots`/`__dot`, `--fade` `--none` — voir [Carrousel](#carrousel) |

**Niveaux de titre.** `.j6n-card__title` et `.j6n-modal__title` sont des classes : choisissez la balise (`h2`, `h3`…) qui suit la hiérarchie de votre page. La démo utilise `h3` parce que ses cartes sont sous un `h2`.

**Carte entièrement cliquable.** Un seul vrai lien, dans le titre ; sa zone s'étend à toute la carte, mais son nom reste le titre :

```html
<article class="j6n-card j6n-card--interactive">
  <h3 class="j6n-card__title"><a class="j6n-card__link" href="/sorties/crete-des-ayes">Crête des Ayes</a></h3>
  <p class="j6n-muted">Sortie longue en sentier.</p>
</article>
```

### Carrousel

Motif [WAI-ARIA APG Carousel](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/), conforme RGAA 13.8 / WCAG 2.2.2 : le défilement automatique est **toujours** interruptible. Ces règles ne sont pas réglables, c'est volontaire :

- bouton Lecture/Pause en tête du carrousel, nom accessible qui reprend le texte visible (« Pause du défilement ») ;
- pause tant que la souris survole les diapositives (reprise à la sortie) ;
- arrêt dès que le focus entre dans le carrousel (flèches, pastilles, lien d'une diapositive…), sans reprise implicite — il faut réappuyer sur Lecture ;
- arrêt quand l'onglet est masqué, pas de lecture automatique si `prefers-reduced-motion: reduce` (le bouton Lecture reste disponible) ;
- diapositives hors champ en `inert` (ni focus ni lecture d'écran) ; `aria-live="off"` pendant le défilement, `"polite"` à l'arrêt pour annoncer les changements demandés par l'utilisateur ;
- pastille active plus large, pas seulement plus colorée (RGAA 3.1), cibles de 44 px ; aux extrémités sans boucle, les flèches passent en `aria-disabled` (jamais `disabled`, qui ferait perdre le focus).

```html
<section class="j6n-carousel" data-j6n-js="carousel" aria-roledescription="carrousel" aria-label="Sorties de la semaine"
         data-j6n-autoplay="true" data-j6n-delay="5s" data-j6n-transition="slide" data-j6n-duration="600">
  <div class="j6n-carousel__toolbar">
    <button type="button" class="j6n-btn j6n-btn--secondary j6n-btn--sm" data-j6n-carousel-play>
      <span class="j6n-carousel__play-icon" aria-hidden="true"></span><span class="j6n-carousel__play-label">Pause</span><span class="j6n-sr-only"> du défilement</span>
    </button>
    <div class="j6n-carousel__progress" aria-hidden="true"><span class="j6n-carousel__progress-bar"></span></div>
    <div class="j6n-carousel__nav">
      <span class="j6n-carousel__counter" aria-hidden="true">1 / 3</span>
      <button type="button" class="j6n-btn j6n-btn--secondary j6n-btn--icon" data-j6n-carousel-prev aria-controls="sorties-track" aria-label="Diapositive précédente"><span class="j6n-carousel__arrow j6n-carousel__arrow--prev" aria-hidden="true"></span></button>
      <button type="button" class="j6n-btn j6n-btn--secondary j6n-btn--icon" data-j6n-carousel-next aria-controls="sorties-track" aria-label="Diapositive suivante"><span class="j6n-carousel__arrow j6n-carousel__arrow--next" aria-hidden="true"></span></button>
    </div>
  </div>
  <div class="j6n-carousel__viewport">
    <div class="j6n-carousel__track" id="sorties-track" aria-live="off">
      <div class="j6n-carousel__slide" role="group" aria-roledescription="diapositive" aria-label="1 sur 3">…</div>
      <div class="j6n-carousel__slide" role="group" aria-roledescription="diapositive" aria-label="2 sur 3" data-j6n-delay="9s">…</div>
      <div class="j6n-carousel__slide" role="group" aria-roledescription="diapositive" aria-label="3 sur 3">…</div>
    </div>
  </div>
  <!-- Facultatif. Laissé vide, theme.js génère une pastille par diapositive. -->
  <div class="j6n-carousel__dots" role="group" aria-label="Choisir une diapositive"></div>
</section>
```

Le contenu d'une diapositive est libre (carte, image, texte). Pour une image légendée : `<figure class="j6n-carousel__slide">` avec `.j6n-carousel__media` (16/9, `object-fit: cover`) et `<figcaption class="j6n-carousel__caption">`. Le bouton Lecture/Pause, la barre de progression, le compteur et les pastilles sont tous facultatifs ; sans `data-j6n-autoplay`, le bouton et la barre sont masqués d'eux-mêmes.

**Réglages** — en attribut sur le `.j6n-carousel`, ou en option JS (l'option JS l'emporte). Les durées acceptent des millisecondes (`5000`) ou des secondes (`"5s"`).

| Attribut | Option JS | Défaut | Effet |
| --- | --- | --- | --- |
| `data-j6n-autoplay` | `autoplay` | `false` | défilement automatique |
| `data-j6n-delay` | `delay` | `6000` | temps d'affichage d'une diapositive (1 s minimum) ; surchargeable par diapositive avec `data-j6n-delay` sur le `.j6n-carousel__slide` |
| `data-j6n-transition` | `transition` | `'slide'` | `'slide'` (glissement), `'fade'` (fondu) ou `'none'` |
| `data-j6n-duration` | `duration` | `--j6n-dur-3` (420 ms) | durée de la transition |
| `data-j6n-easing` | `easing` | `--j6n-ease` | courbe CSS de la transition |
| `data-j6n-loop` | `loop` | `true` | revenir au début après la dernière (`"false"` : s'arrête à la fin) |
| `data-j6n-rotations` | `rotations` | `0` | nombre de tours avant arrêt automatique (`0` : illimité) |
| `data-j6n-start` | `start` | `0` | diapositive de départ (index à partir de 0) |
| `data-j6n-swipe` | `swipe` | `true` | glissement tactile (doigt/stylet ; la souris garde la sélection de texte) |
| `data-j6n-progress` | `progress` | `true` | barre de temps restant (figée pendant une pause) |

En CSS, les mêmes valeurs passent par `--j6n-carousel-delay`, `--j6n-carousel-duration` et `--j6n-carousel-easing`, posées par le JS sur chaque carrousel.

**API JS** — `j6n.carousel(élément | sélecteur, options)` crée le carrousel, ou renvoie celui qui existe déjà (en lui appliquant `options`) :

```js
const c = j6n.carousel('#promo', { autoplay: true, delay: 4000, transition: 'fade', duration: 800 });
c.next(); c.prev(); c.goTo(2);
c.play(); c.pause();
c.set({ delay: 8000, loop: false });   // réglage à chaud
c.index; c.total; c.playing; c.options;

el.addEventListener('j6n:carousel-change', (e) => console.log(e.detail.index, e.detail.total, e.detail.slide));
el.addEventListener('j6n:carousel-state', (e) => console.log(e.detail.playing));
```

En React/Angular, monter le balisage puis appeler `j6n.carousel(ref)` (ou `j6n.init(conteneur)` si l'élément porte `data-j6n-js="carousel"`). Démonstration complète, avec réglages en direct : `demo/donnees.html#carrousel`.

### Utilitaires

`.j6n-container` `.j6n-stack` `.j6n-row` `.j6n-grid` `.j6n-layout` (mise en page à sommaire latéral) `.j6n-eyebrow` `.j6n-muted` `.j6n-mono` `.j6n-divider-run` `.j6n-skeleton` `.j6n-chevron` `.j6n-close` `.j6n-spinner` `.j6n-sr-only` (contenu réservé aux lecteurs d'écran), et les utilitaires d'espacement `.j6n-m-*`, `.j6n-p-*`, `.j6n-gap-*`… (voir [Espacements](#espacements-padding-margin-gap))

## Contrôles & dynamisme

`theme.js` amorce en posant `data-j6n="true"` sur `<html>`, puis active chaque composant dynamique via un attribut dédié — jamais en lisant les classes CSS, pour garder style et comportement séparés.

| Attribut / élément | Composant |
| --- | --- |
| `data-j6n-js="accordion-group"` | ferme les autres `<details>` du groupe à l'ouverture d'un item |
| `data-j6n-js="tabs"` | onglets — clic + flèches clavier |
| `data-j6n-modal-open="id"` / `data-j6n-modal-close` | ouvre/ferme un `<dialog class="j6n-modal">` |
| `[popovertarget]` | positionne le menu déroulant sous son déclencheur (le reste est natif) |
| `data-j6n-js="combobox"` | filtre, navigation clavier, sélection |
| `[data-tooltip]` | ajoute le support tactile (tap pour afficher/masquer) |
| `data-j6n-js="password"` + `data-j6n-password-toggle` | bascule visibilité + indicateur de force |
| `data-j6n-js="range"` | remplissage de piste + valeur affichée |
| `data-j6n-js="upload"` + `data-j6n-upload-trigger` | glisser-déposer + liste de fichiers ; le bouton ouvre le sélecteur, le champ masqué sort de l'ordre de tabulation |
| `data-j6n-dismiss="clé"` + `data-j6n-dismiss-target="id"` | ferme et mémorise en `localStorage` (notice, consentement). `data-j6n-dismiss-value` : valeur enregistrée (défaut `1`) ; `data-j6n-dismiss-focus="sélecteur"` : où va le focus (défaut : élément suivant). Évènement `j6n:dismiss` (`detail.key`, `detail.value`) |
| `data-j6n-js="toc"` | surligne le lien courant au défilement (`IntersectionObserver`) |
| `data-j6n-js="table-sort"` | tri des lignes au clic sur un `.j6n-table__sort` |
| `data-j6n-js="menu-toggle"` | ouvre/ferme le menu mobile du header |
| `data-j6n-js="unit-switch"` | diffuse un évènement `j6n:unit-change` |
| `data-j6n-js="carousel"` + `data-j6n-carousel-play/-prev/-next` | carrousel : défilement réglable, pause, flèches, pastilles, glissement tactile |

Sans attribut : `.j6n-table-wrap` (zone focalisable nommée), `[data-tooltip]` (infobulle reliée par `aria-describedby`), boutons `.is-loading` / `[aria-disabled="true"]` (clics bloqués).

API publique (types dans `theme.d.ts`) :

| Fonction | Rôle |
| --- | --- |
| `j6n.init(root)` | active les composants d'un sous-arbre injecté après le chargement |
| `j6n.destroy(root)` | retire écouteurs, minuteries et observateurs du sous-arbre ; sans argument : des composants sortis de la page |
| `j6n.toast(message, { tone, duration })` | notification ; `tone: 'danger'` annoncée en priorité et persistante ; `duration: 0` jusqu'à fermeture |
| `j6n.announce(message, { assertive })` | message pour lecteur d'écran seulement (zone `aria-live` créée dès l'activation) |
| `j6n.openModal(id)` / `j6n.closeModal(id)` | modale |
| `j6n.carousel(el, options)` | pilote un carrousel |
| `j6n.dismissed(clé)` | valeur mémorisée d'un bandeau fermé (ex. choix de consentement), ou `null` |

`localStorage` indisponible (navigation privée, stockage bloqué) : les bandeaux restent simplement non mémorisés, le reste s'active normalement.

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

`demo/` couvre l'ensemble des composants sur sept pages, à ouvrir directement dans un navigateur (aucun serveur requis) :

| Page | Contenu |
| --- | --- |
| `demo/index.html` | sommaire, tokens, règles |
| `demo/espacements.html` | échelle de cadence, marges par défaut, classes utilitaires d'espacement avec démonstrations |
| `demo/actions.html` | boutons, contrôle segmenté, interrupteur, étiquettes |
| `demo/formulaires.html` | champs, recherche, mot de passe, curseur, import, combobox |
| `demo/navigation.html` | fil d'Ariane, onglets, menu déroulant, pagination, étapes, tuiles, pied de page |
| `demo/retours.html` | alertes, toasts, infobulles, modale, accordéon, mise en avant, consentement |
| `demo/donnees.html` | carte, tableau triable, citation, téléchargement, menu utilisateur, connexion externe, carrousel |

Chaque exemple des cinq pages de composants a un bloc **Résultat / Code** avec un simulateur de largeur (Mobile / Tablette / Large) et un bouton « Copier », dans l'esprit des pages de démonstration de systeme-de-design.gouv.fr. Le header de la démo a aussi une recherche de composant (bouton « Rechercher », ou `/` et Ctrl+K au clavier) : elle indexe les titres de section (`<h2 id>`) des pages listées dans la navigation, sans liste à maintenir — une nouvelle section avec un `id` y apparaît d'elle-même. Elle demande que la démo soit servie (Netlify, ou `python3 -m http.server` en local) : ouverte en `file://`, le bouton reste caché. Ça vit dans `demo/showcase.css` + `demo/showcase.js` — un outil pour ces pages de démo, pas une partie du design system livré (rien à installer dans un vrai projet).

## Règles

À faire :
- passer par les variables `--j6n-*`, jamais de valeur en dur ;
- un seul usage de l'accent par écran, réservé à l'action principale (les chips de marque `--strava`/`--garmin` de `.j6n-connect` font exception : elles identifient un tiers, pas l'action principale de l'écran) ;
- cibles tactiles à 44 px minimum ;
- `--j6n-font-mono` pour les valeurs mesurées, les libellés en petites capitales et le code ;
- séparer comportement et style : les hooks JS sont des attributs `data-j6n-*`, jamais des classes `.j6n-*`.

À éviter :
- dégradés de fond et ombres floues ;
- le mono pour du texte courant ;
- des px hors de l'échelle de cadence.

## Accessibilité (RGAA / WCAG 2.1 AA)

Un audit du code a été fait et corrigé sur cette base — pas seulement une relecture visuelle :

- **Contraste** : chaque paire texte/fond et chaque frontière fonctionnelle (champ, tuile de choix, tag, piste d'interrupteur…) a été *calculée* (conversion oklch → luminance relative WCAG), pas estimée à l'œil. Ça a fait remonter et corrigé de vrais échecs : `--j6n-border-strong` ne passait pas 3:1 sur fond clair *ni* sombre (d'où le nouveau `--j6n-border-interactive`, réservé aux frontières qui portent seules une information — les liserés purement décoratifs gardent `--j6n-border-strong`) ; `--j6n-danger` et `--j6n-pine`/`--j6n-pine-soft` tombaient sous 4.5:1 en thème sombre faute d'y avoir jamais été redéfinis ; l'ancien anneau de focus translucide n'atteignait que 1.3:1 en clair — remplacé par un anneau plein à deux tons (écart + trait), qui reste lisible même sur un bouton déjà coloré.
- **Clavier** : chaque composant interactif est utilisable sans souris, y compris ceux avec un état caché (menu déroulant, combobox, onglets, accordéon, modale). Un vrai bug a été trouvé et corrigé au passage : l'étiquette `.j6n-tag` imbriquait un `<span>` de retrait *dans* le bouton principal — inatteignable au Tab et dupliquant le nom accessible du bouton. C'est maintenant deux boutons frères.
- **Focus** : la modale (`<dialog>` natif) piège le focus et le restitue au déclencheur nativement ; les menus (Popover API) rendent le focus au bouton qui les a ouverts à la fermeture.
- **ARIA** : posé dans le HTML source de chaque page, pas seulement calculé par `theme.js` au chargement — un analyseur statique (SonarQube, axe…) ne voit que le balisage, jamais le DOM que le JS construit ; `theme.js` reconfirme les mêmes attributs à l'exécution, en filet de sécurité pour qui oublierait de les écrire. `aria-expanded`/`aria-controls` sur les déclencheurs de menu (le Popover API ne les écrit pas lui-même ; pas d'`aria-haspopup`, réservé aux vrais menus ARIA), `role="listbox"`/`"option"` + `aria-selected`/`aria-controls` du combobox, `aria-current="page"` sur le lien de navigation actif, association automatique champ ↔ message d'aide/erreur via `aria-describedby` (`initFieldDescriptions`), annonce discrète (`aria-live`) du résultat d'un tri de tableau. Le combobox suit le motif officiel du WAI-ARIA (`role="option"` sur des `<div>`, pas de `<option>` natif) — c'est volontaire : aucun élément natif ne combine filtrage libre à la frappe et liste stylée (`<select>` ne filtre pas, `<datalist>` ne se stylise pas). Un linter générique « préfère le natif à ARIA » peut le signaler ; c'est un faux positif connu sur ce motif, documenté dans `demo/formulaires.html`.
- **Structure** : lien d'évitement, hiérarchie de titres sans saut de niveau, un seul `<main>` par page, `<nav>` distingués par `aria-label` quand il y en a plusieurs, légende de tableau (`.j6n-sr-only`), `autocomplete` sur les champs d'identité (email, mot de passe, pseudo).
- **Contraste élevé (Windows)** : en mode `forced-colors`, les ombres disparaissent. Chaque anneau de focus est donc doublé d'un `outline` transparent, que ce mode rend visible, et les états dessinés en couleur de fond (interrupteur, option choisie, page courante, étape terminée, jauge, pastilles) reçoivent une couleur système.
- **Messages de statut** : toasts, tri de tableau, nombre de suggestions, fichiers ajoutés ou retirés passent par deux zones `aria-live` créées dès l'activation (une zone créée en même temps que son contenu n'est souvent pas annoncée). Les toasts restent affichés tant que la souris ou le focus y est (WCAG 2.2.1).
- **Focus préservé** : fermer un bandeau, retirer un fichier ou fermer un toast renvoie le focus à un endroit logique au lieu du haut de la page (WCAG 2.4.3).
- **Mouvement** : `prefers-reduced-motion` déjà pris en compte pour tout le système ; l'indicateur de chargement (`.j6n-spinner`) garde un mouvement minimal même dans ce cas, un indicateur figé ne voulant plus rien dire.

**Limite honnête** : ceci est un audit de code, pas une certification RGAA. Une conformité déclarée demande une méthodologie que je ne peux pas reproduire ici — échantillon de pages, tests réels au lecteur d'écran (NVDA, JAWS, VoiceOver), navigation clavier bout en bout par une personne, et la déclaration d'accessibilité elle-même. Avant une mise en production, fais au moins un passage clavier seul (Tab/Échap/flèches sur chaque page) et un passage avec un lecteur d'écran sur les composants les plus riches (combobox, modale, menu déroulant, tableau triable).

## Publication

Une version se publie de deux façons, toutes deux gérées par `.github/workflows/release.yml` :

1. **Automatique** : changez `version` dans `package.json` et poussez sur `master` (push direct ou merge de PR). Si le tag `vX.Y.Z` correspondant n'existe pas encore, la CI le crée puis publie. Un push qui ne change pas la version ne publie rien.
2. **Manuelle** : poussez vous-même un tag, comme avant.

```sh
git tag v1.0.0
git push origin v1.0.0
```

Dans les deux cas, le projet est d'abord vérifié (`ci.yml`, réutilisé), puis empaqueté (`theme.css`, `theme.js`, leurs versions `.min` produites par esbuild, `theme.d.ts`, `fonts.css` + `fonts/`, `README.md`, `LICENSE`) en `.zip` et `.tar.gz` attachés à une Release GitHub, avec des notes générées depuis les commits/PR depuis le tag précédent, et enfin publié sur npm.

- `scripts/validate.sh` — les mêmes vérifications tournent à chaque push/PR (`ci.yml`) et avant chaque release ; à lancer en local avant de taguer.
- `scripts/package.sh` — assemble le paquet ; utilisable en local pour en vérifier le contenu (`VERSION=0.0.0-test scripts/package.sh`).

### Démo en ligne

`netlify.toml` publie tout le dépôt (les pages de `demo/` référencent `../theme.css`/`../theme.js`, donc la racine doit être servie aussi) et redirige `/` vers `/demo/` en 301 — une réécriture 200 ferait résoudre les chemins relatifs de la page depuis la racine (CSS, JS et liens en 404). `robots.txt`, `sitemap.xml` et `404.html` sont à la racine ; `404.html` n'utilise que des chemins absolus, Netlify la servant à n'importe quelle profondeur. À chaque déploiement, `scripts/stamp-version.sh` recopie la version de `package.json` dans le JSON-LD de `demo/index.html`. Connecter le dépôt sur [app.netlify.com](https://app.netlify.com) suffit — Netlify lit `netlify.toml` automatiquement, aucune configuration supplémentaire.

## Licence

MIT.
