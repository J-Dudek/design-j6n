# Changelog

## 0.3.0 — V3

### Ajouts
- Composants : `.j6n-progress`, `.j6n-avatar` / `.j6n-avatar-group`, `.j6n-empty`, `.j6n-drawer`, `.j6n-timeline`, `.j6n-rating` / `.j6n-rating-input`, `.j6n-sparkline`, `.j6n-otp`.
- Animations : `data-j6n-reveal`, `data-j6n-count`, `data-j6n-tilt`, `.j6n-text-gradient`, `.j6n-badge--live`, `.j6n-scroll-progress`, onde au clic des boutons, barre de temps des toasts.
- API : `j6n.setTheme(mode, event?)` (bascule en cercle via View Transitions) ; événement `j6n:otp`.
- `scripts/contrast.mjs` : audit des contrastes V3 dans les 4 thèmes, branché sur `scripts/validate.sh`.
- Démo : page « Nouveautés V3 », transitions entre pages.

### Changements visuels (rétrocompatibles, aucune classe renommée)
- Boutons en pilule avec reflet, rebond et halo ; cartes/tuiles dégradées qui lévitent ; rayons `--j6n-radius-md` 10 px et `--j6n-radius-lg` 18 px.
- Modale, menus déroulants, accordéons, alertes et toasts animés ; squelette à balayage lumineux ; en-tête en verre dépoli avec ombre au défilement.

### Accessibilité
- Tout mouvement est coupé sous `prefers-reduced-motion` ; contenu visible sans JS ; dégradés décoratifs retirés en `forced-colors`.
