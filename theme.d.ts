/* Types de l'API publique de theme.js (window.j6n).
   theme.js n'exporte rien : il s'exécute à l'import et expose window.j6n.
   Usage TypeScript : import 'design-j6n'; puis window.j6n.toast(…). */

export interface J6nToastOptions {
  /** Teinte : 'danger' est annoncé en priorité et ne disparaît pas seul. */
  tone?: 'success' | 'warning' | 'danger';
  /** Durée d'affichage en ms (défaut 6000, 0 pour un toast d'erreur). 0 : jusqu'à fermeture. */
  duration?: number;
}

export interface J6nAnnounceOptions {
  /** true : annonce prioritaire (aria-live="assertive"). */
  assertive?: boolean;
}

export interface J6nCarouselOptions {
  autoplay?: boolean;
  /** ms, ou chaîne « 6s ». */
  delay?: number | string;
  transition?: 'slide' | 'fade' | 'none';
  duration?: number | string | null;
  easing?: string | null;
  loop?: boolean;
  rotations?: number;
  start?: number;
  swipe?: boolean;
  progress?: boolean;
}

export interface J6nCarousel {
  next(): void;
  prev(): void;
  goTo(index: number): void;
  play(): void;
  pause(): void;
  set(options: J6nCarouselOptions): void;
  readonly index: number;
  readonly total: number;
  readonly playing: boolean;
  readonly options: Required<J6nCarouselOptions>;
}

export interface J6n {
  /** Active les composants d'un sous-arbre injecté après le chargement. */
  init(root?: ParentNode): void;
  /** Retire écouteurs, minuteries et observateurs des composants de root ; sans argument : de ceux qui ne sont plus dans la page. */
  destroy(root?: Node): void;
  toast(message: string, options?: J6nToastOptions): HTMLElement;
  /** Message pour lecteur d'écran, sans rien afficher. */
  announce(message: string, options?: J6nAnnounceOptions): void;
  openModal(id: string): void;
  closeModal(id: string): void;
  carousel(target: string | Element, options?: J6nCarouselOptions): J6nCarousel | null;
  /** Valeur mémorisée par data-j6n-dismiss (ex. "accepte" / "refuse"), ou null. */
  dismissed(key: string): string | null;
  /** Change le thème clair/sombre ; avec un événement de pointeur, le nouveau thème s'étend en cercle depuis le clic (View Transitions). 'auto' suit le système. */
  setTheme(mode: 'light' | 'dark' | 'auto', origin?: { clientX: number; clientY: number }): void;
}

declare global {
  interface Window { j6n: J6n; }
  interface DocumentEventMap {
    'j6n:unit-change': CustomEvent<{ unit: string }>;
  }
  interface HTMLElementEventMap {
    'j6n:dismiss': CustomEvent<{ key: string | null; value: string }>;
    'j6n:carousel-change': CustomEvent<{ index: number; total: number; slide: HTMLElement }>;
    'j6n:carousel-state': CustomEvent<{ playing: boolean }>;
  }
}
