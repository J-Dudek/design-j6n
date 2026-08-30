# design-j6n

Design system personnel — **Foulée**. Nature et trail pour les couleurs, vert terminal pour l'énergie.
Deux fichiers (`theme.css` + `theme.js`), aucune dépendance, aucun build. Utilisable en HTML statique, Angular ou React.
Parité fonctionnelle avec les composants et contrôles du [Système de Design de l'État](https://www.systeme-de-design.gouv.fr/) (DSFR), adaptée à la charte Foulée — les composants trop institutionnels (FranceConnect, cookies RGPD, sélecteur de langue…) sont réinterprétés pour un usage perso plutôt que copiés tels quels.

- Préfixe : `--j6n-*` pour les variables, `.j6n-*` pour les classes, `data-j6n-*` pour les hooks JS
- Typographie : [Sora](https://fonts.google.com/specimen/Sora) + [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono)
- Thème clair et sombre, à parité
- Couleurs en `oklch()` (Chrome/Edge 111+, Safari 15.4+, Firefox 113+)
- `theme.js` s'appuie sur les éléments natifs (`<details>`, `<dialog>`, Popover API) plutôt que de réimplémenter le comportement en JS — fonctionne sans lui pour l'accordéon et la modale, requis pour les onglets, le menu déroulant, le combobox et les bandeaux mémorisés

## Installation

Copier `theme.css` (styles) et `theme.js` (comportements) dans le projet. Les polices sont importées par `theme.css` lui-même.

### HTML statique

```html
<link rel="stylesheet" href="theme.css">
<script src="theme.js"></script>
```

### Angular

```jsonc
// angular.json → architect.build.options
"styles": ["src/theme.css", "src/styles.css"],
"scripts": ["src/theme.js"]
```

### React / Vite / CRA

```js
// main.jsx ou index.js
import './theme.css';
import './theme.js';
```

En SPA, si du contenu est injecté dynamiquement après le chargement initial (ex. un composant React monté plus tard), appeler `j6n.init(monConteneur)` pour activer les comportements sur ce sous-arbre.

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
| Surfaces | `--j6n-bg`, `--j6n-surface`, `--j6n-surface-2`, `--j6n-border`, `--j6n-border-strong` (décoratif), `--j6n-border-interactive` (3:1 garanti — champ, tag, tuile de choix, piste d'interrupteur…) |
| Texte | `--j6n-text`, `--j6n-text-muted`, `--j6n-text-invert` |
| Typo | `--j6n-font-sans`, `--j6n-font-mono`, `--j6n-text-xs` → `--j6n-text-3xl` |
| Cadence | `--j6n-space-1` (4px) → `--j6n-space-9` (96px) |
| Formes | `--j6n-radius-sm` (4) · `-md` (8) · `-lg` (14) · `-pill` |
| Élévation | `--j6n-shadow-sm`, `--j6n-shadow-md`, `--j6n-ring` |
| Mouvement | `--j6n-ease`, `--j6n-dur-1` (120ms) · `-2` (220ms) · `-3` (420ms) |

## Composants

### Actions

| Classe | Variantes |
| --- | --- |
| `.j6n-btn` | `--secondary` `--pine` `--ghost` `--sm` `--lg` `--block` `--icon`, état `.is-loading` (spinner) |
| `.j6n-segmented` | groupe de radios stylé, une seule sélection visible |
| `.j6n-toggle` | interrupteur on/off (`__track`) |
| `.j6n-tag` | étiquette filtrable, `.is-active`, `__remove` |

### Formulaires

| Classe | Variantes |
| --- | --- |
| `.j6n-field` | avec `.j6n-label`, `.j6n-input`, `.j6n-select`, `.j6n-textarea`, `.j6n-hint` (`--valid`/`--danger`), `.j6n-check`, `--icon` (+ `__icon`), `__count` |
| `.j6n-fieldset` / `.j6n-legend` | groupe de champs (radio/case à cocher) |
| `.j6n-choice-tile` | radio/case à cocher en tuile bordée, sélection via `:has()` |
| `.j6n-search` | champ + bouton fusionnés (`__input`, `__btn`) |
| `.j6n-password` | champ + bascule visibilité (`__toggle`), `.j6n-password__meter` (force) |
| `.j6n-range-field` / `.j6n-range` | curseur avec piste remplie et valeur affichée |
| `.j6n-upload` | zone de glisser-déposer, `.is-dragover`, `__list`/`__item` |
| `.j6n-combobox` | saisie avec suggestions filtrées (`__list`, `__option`) |

### Navigation

| Classe | Variantes |
| --- | --- |
| `.j6n-header` | avec `.j6n-brand`, `.j6n-nav`, `.j6n-nav__link.is-active`, `.j6n-nav__toggle` (menu mobile) |
| `.j6n-breadcrumb` | fil d'Ariane, `[aria-current="page"]` |
| `.j6n-tabs__list` / `__tab` / `__panel` | onglets accessibles (flèches clavier) |
| `.j6n-dropdown__menu` | menu déroulant (`popover` natif), `__item`, `__divider` |
| `.j6n-sidemenu` | navigation verticale, `__link.is-active`, `__sublist` |
| `.j6n-toc` | sommaire à suivi de défilement |
| `.j6n-pagination` | `[aria-current="page"]`, `.is-ellipsis`, `.is-disabled` |
| `.j6n-skiplink` | lien d'évitement, visible au focus |
| `.j6n-stepper` | étapes numérotées, `.is-current` / `.is-done` |
| `.j6n-tile` | tuile de navigation, `--horizontal` |
| `.j6n-footer` | pied de page multi-colonnes (`__grid`, `__col`, `__bottom`) |

### Retours

| Classe | Variantes |
| --- | --- |
| `dialog.j6n-modal` | modale (`<dialog>` natif), `__header`, `__body`, `__footer` |
| `[data-tooltip]` | infobulle CSS, `data-tooltip-pos="bottom"` |
| `.j6n-notice` | bandeau pleine largeur, fermeture mémorisée |
| `.j6n-accordion` | `<details>` stylés, `__trigger`, `__panel` |
| `.j6n-callout` | mise en avant, `--pine` |
| `.j6n-consent` | bandeau de consentement générique, fermeture mémorisée |
| `.j6n-alert` | `--success` `--warning` `--danger`, `__close` |
| `.j6n-toast` | pile de toasts via l'API JS `j6n.toast()` |

### Données & contenu

| Classe | Variantes |
| --- | --- |
| `.j6n-card` | `--interactive`, plus `.j6n-card__title`, `.j6n-card__meta` |
| `.j6n-stat` | `__value`, `__unit`, `__label` — chiffres tabulaires |
| `.j6n-badge` | `--accent` `--pine` `--solid`, plus `.j6n-badge__dot` |
| `.j6n-table` | `.j6n-table-wrap`, `[data-numeric]`, `.j6n-table__sort` (tri au clic) |
| `.j6n-quote` | citation avec `__cite` |
| `.j6n-highlight` | mise en exergue de texte |
| `.j6n-download` | lien de téléchargement, `__ext`, `__name`, `__meta` |
| `.j6n-user-menu__trigger` | avatar + menu (réutilise `.j6n-dropdown__menu`) |
| `.j6n-connect` | connexion à un service externe, `--strava` `--garmin` |
| `.j6n-unit-switch` | bascule d'unités (réutilise `.j6n-segmented`) |
| `.j6n-pre` | blocs de code, toujours sombres ; `.tok-key` `.tok-str` `.tok-com` |

### Utilitaires

`.j6n-container` `.j6n-stack` `.j6n-row` `.j6n-grid` `.j6n-layout` (mise en page à sommaire latéral) `.j6n-eyebrow` `.j6n-muted` `.j6n-mono` `.j6n-divider-run` `.j6n-skeleton` `.j6n-chevron` `.j6n-close` `.j6n-spinner` `.j6n-sr-only` (contenu réservé aux lecteurs d'écran)

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
| `data-j6n-js="upload"` | glisser-déposer + liste de fichiers |
| `data-j6n-dismiss="clé"` + `data-j6n-dismiss-target="id"` | ferme et mémorise en `localStorage` (notice, consentement) |
| `data-j6n-js="toc"` | surligne le lien courant au défilement (`IntersectionObserver`) |
| `data-j6n-js="table-sort"` | tri des lignes au clic sur un `.j6n-table__sort` |
| `data-j6n-js="menu-toggle"` | ouvre/ferme le menu mobile du header |
| `data-j6n-js="unit-switch"` | diffuse un évènement `j6n:unit-change` |

API publique : `j6n.init(root)` (réactiver un sous-arbre injecté dynamiquement), `j6n.toast(message, { tone, duration })`, `j6n.openModal(id)`, `j6n.closeModal(id)`.

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

`demo/` couvre l'ensemble des composants sur six pages, à ouvrir directement dans un navigateur (aucun serveur requis) :

| Page | Contenu |
| --- | --- |
| `demo/index.html` | sommaire, tokens, règles |
| `demo/actions.html` | boutons, contrôle segmenté, interrupteur, étiquettes |
| `demo/formulaires.html` | champs, recherche, mot de passe, curseur, import, combobox |
| `demo/navigation.html` | fil d'Ariane, onglets, menu déroulant, pagination, étapes, tuiles, pied de page |
| `demo/retours.html` | alertes, toasts, infobulles, modale, accordéon, mise en avant, consentement |
| `demo/donnees.html` | carte, tableau triable, citation, téléchargement, menu utilisateur, connexion externe |

Chaque exemple des cinq pages de composants a un bloc **Résultat / Code** avec un simulateur de largeur (Mobile / Tablette / Large) et un bouton « Copier », dans l'esprit des pages de démonstration de systeme-de-design.gouv.fr. Ça vit dans `demo/showcase.css` + `demo/showcase.js` — un outil pour ces pages de démo, pas une partie du design system livré (rien à installer dans un vrai projet).

## Règles

À faire :
- passer par les variables `--j6n-*`, jamais de valeur en dur ;
- un seul usage de l'accent par écran, réservé à l'action principale (les chips de marque `--strava`/`--garmin` de `.j6n-connect` font exception : elles identifient un tiers, pas l'action principale de l'écran) ;
- cibles tactiles à 44 px minimum ;
- `--j6n-font-mono` pour les valeurs mesurées, les libellés en petites capitales et le code ;
- séparer comportement et style : les hooks JS sont des attributs `data-j6n-*`, jamais des classes `.j6n-*`.

## Accessibilité (RGAA / WCAG 2.1 AA)

Un audit du code a été fait et corrigé sur cette base — pas seulement une relecture visuelle :

- **Contraste** : chaque paire texte/fond et chaque frontière fonctionnelle (champ, tuile de choix, tag, piste d'interrupteur…) a été *calculée* (conversion oklch → luminance relative WCAG), pas estimée à l'œil. Ça a fait remonter et corrigé de vrais échecs : `--j6n-border-strong` ne passait pas 3:1 sur fond clair *ni* sombre (d'où le nouveau `--j6n-border-interactive`, réservé aux frontières qui portent seules une information — les liserés purement décoratifs gardent `--j6n-border-strong`) ; `--j6n-danger` et `--j6n-pine`/`--j6n-pine-soft` tombaient sous 4.5:1 en thème sombre faute d'y avoir jamais été redéfinis ; l'ancien anneau de focus translucide n'atteignait que 1.3:1 en clair — remplacé par un anneau plein à deux tons (écart + trait), qui reste lisible même sur un bouton déjà coloré.
- **Clavier** : chaque composant interactif est utilisable sans souris, y compris ceux avec un état caché (menu déroulant, combobox, onglets, accordéon, modale). Un vrai bug a été trouvé et corrigé au passage : l'étiquette `.j6n-tag` imbriquait un `<span>` de retrait *dans* le bouton principal — inatteignable au Tab et dupliquant le nom accessible du bouton. C'est maintenant deux boutons frères.
- **Focus** : la modale (`<dialog>` natif) piège le focus et le restitue au déclencheur nativement ; les menus (Popover API) rendent le focus au bouton qui les a ouverts à la fermeture.
- **ARIA** : posé dans le HTML source de chaque page, pas seulement calculé par `theme.js` au chargement — un analyseur statique (SonarQube, axe…) ne voit que le balisage, jamais le DOM que le JS construit ; `theme.js` reconfirme les mêmes attributs à l'exécution, en filet de sécurité pour qui oublierait de les écrire. `aria-expanded`/`aria-haspopup` sur les déclencheurs de menu (le Popover API ne les écrit pas lui-même), `role="listbox"`/`"option"` + `aria-selected`/`aria-controls` du combobox, `aria-current="page"` sur le lien de navigation actif, association automatique champ ↔ message d'aide/erreur via `aria-describedby` (`initFieldDescriptions`), annonce discrète (`aria-live`) du résultat d'un tri de tableau. Le combobox suit le motif officiel du WAI-ARIA (`role="option"` sur des `<div>`, pas de `<option>` natif) — c'est volontaire : aucun élément natif ne combine filtrage libre à la frappe et liste stylée (`<select>` ne filtre pas, `<datalist>` ne se stylise pas). Un linter générique « préfère le natif à ARIA » peut le signaler ; c'est un faux positif connu sur ce motif, documenté dans `demo/formulaires.html`.
- **Structure** : lien d'évitement, hiérarchie de titres sans saut de niveau, un seul `<main>` par page, `<nav>` distingués par `aria-label` quand il y en a plusieurs, légende de tableau (`.j6n-sr-only`), `autocomplete` sur les champs d'identité (email, mot de passe, pseudo).
- **Mouvement** : `prefers-reduced-motion` déjà pris en compte pour tout le système ; l'indicateur de chargement (`.j6n-spinner`) garde un mouvement minimal même dans ce cas, un indicateur figé ne voulant plus rien dire.

**Limite honnête** : ceci est un audit de code, pas une certification RGAA. Une conformité déclarée demande une méthodologie que je ne peux pas reproduire ici — échantillon de pages, tests réels au lecteur d'écran (NVDA, JAWS, VoiceOver), navigation clavier bout en bout par une personne, et la déclaration d'accessibilité elle-même. Avant une mise en production, fais au moins un passage clavier seul (Tab/Échap/flèches sur chaque page) et un passage avec un lecteur d'écran sur les composants les plus riches (combobox, modale, menu déroulant, tableau triable).

À éviter :
- dégradés de fond et ombres floues ;
- le mono pour du texte courant ;
- des px hors de l'échelle de cadence.

## Licence

MIT.
