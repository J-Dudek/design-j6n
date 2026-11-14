/* ============================================================
   FOULÉE — contrôles & dynamisme
   Aucune dépendance, aucun build. Charger en fin de <body>, ou dans
   le <head> avec defer : <script src="theme.js" defer></script>
   S'appuie sur les éléments natifs (<details>, <dialog>, popover)
   plutôt que de tout réimplémenter en JS.
   API publique : window.j6n.init(root), j6n.destroy(root),
   j6n.toast(msg, opts), j6n.announce(msg, opts), j6n.openModal(id),
   j6n.closeModal(id), j6n.carousel(el, options), j6n.dismissed(clé).
   ============================================================ */
(function () {
  'use strict';

  // Rendu côté serveur (Next.js, Angular SSR…) : ni window ni document — ne rien faire.
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const BOUND = 'j6nBound';
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function uid(prefix) { return prefix + '-' + Math.random().toString(36).slice(2, 8); }

  function addToken(el, attr, token) {
    const tokens = (el.getAttribute(attr) || '').split(/\s+/).filter(Boolean);
    if (tokens.indexOf(token) === -1) tokens.push(token);
    el.setAttribute(attr, tokens.join(' '));
  }
  function removeToken(el, attr, token) {
    const tokens = (el.getAttribute(attr) || '').split(/\s+/).filter(function (t) { return t && t !== token; });
    if (tokens.length) el.setAttribute(attr, tokens.join(' '));
    else el.removeAttribute(attr);
  }

  /* ---------- Cycle de vie : init / destroy ----------
     Chaque composant activé est enregistré avec un AbortController : tous ses
     écouteurs (y compris ceux posés sur document ou window) passent par son
     signal. j6n.destroy(root) les retire, coupe minuteries et observateurs, et
     permet de réactiver le sous-arbre plus tard — indispensable en SPA, où les
     composants sont démontés à chaque changement de route. */
  const instances = [];

  function bind(el, key) {
    const keys = (el.dataset[BOUND] || '').split(' ');
    if (keys.indexOf(key) > -1) return false;
    el.dataset[BOUND] = (el.dataset[BOUND] || '') + ' ' + key;
    return true;
  }
  function unbind(el, key) {
    const keys = (el.dataset[BOUND] || '').split(' ').filter(function (k) { return k && k !== key; });
    if (keys.length) el.dataset[BOUND] = ' ' + keys.join(' ');
    else delete el.dataset[BOUND];
  }
  // Marque l'élément comme activé et renvoie son cycle de vie, ou null s'il l'était déjà.
  function setup(el, key) {
    if (!bind(el, key)) return null;
    const controller = new AbortController();
    const instance = { el: el, key: key, controller: controller, teardowns: [] };
    instances.push(instance);
    return {
      signal: controller.signal,
      onDestroy: function (fn) { instance.teardowns.push(fn); }
    };
  }

  // destroy(root) : composants situés dans root (root compris).
  // destroy() sans argument : composants qui ne sont plus dans la page.
  function destroy(root) {
    for (let i = instances.length - 1; i >= 0; i--) {
      const instance = instances[i];
      const match = root
        ? root === instance.el || (typeof root.contains === 'function' && root.contains(instance.el))
        : !instance.el.isConnected;
      if (!match) continue;
      instance.controller.abort();
      instance.teardowns.forEach(function (fn) { fn(); });
      unbind(instance.el, instance.key);
      instances.splice(i, 1);
    }
  }

  /* ---------- Stockage local tolérant ----------
     localStorage lève une exception quand il est bloqué (navigation privée de
     certains navigateurs, cookies refusés) : sans try/catch, l'erreur stoppait
     l'activation de tous les composants suivants. */
  const storage = {
    get: function (key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } },
    set: function (key, value) { try { window.localStorage.setItem(key, value); } catch (e) { /* stockage indisponible */ } }
  };

  /* ---------- Annonces pour lecteur d'écran (RGAA 7.5 / WCAG 4.1.3) ----------
     Les deux zones existent dès l'activation : une zone live créée en même temps
     que son contenu n'est souvent pas annoncée. */
  const liveRegions = {};
  function liveRegion(assertive) {
    const key = assertive ? 'assertive' : 'polite';
    let region = liveRegions[key];
    if (!region || !region.isConnected) {
      region = document.getElementById('j6n-live-' + key);
      if (!region) {
        region = document.createElement('div');
        region.id = 'j6n-live-' + key;
        region.className = 'j6n-sr-only';
        region.setAttribute('aria-live', key);
        region.setAttribute('aria-atomic', 'true');
        if (!assertive) region.setAttribute('role', 'status');
        document.body.appendChild(region);
      }
      liveRegions[key] = region;
    }
    return region;
  }
  function ensureLiveRegions() {
    if (!document.body) return;
    liveRegion(false);
    liveRegion(true);
  }
  function announce(message, opts) {
    const region = liveRegion(!!(opts && opts.assertive));
    region.textContent = '';
    // court délai : le texte doit changer après le vidage pour être annoncé, même identique
    setTimeout(function () { region.textContent = message; }, 50);
  }

  /* ---------- Focus : où l'envoyer quand l'élément focalisé disparaît ---------- */
  function isVisible(el) { return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length); }
  function makeFocusable(el) {
    if (!el.matches(FOCUSABLE) && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    return el;
  }
  function focusAfter(target, selector) {
    if (selector) {
      const chosen = document.querySelector(selector);
      if (chosen) return makeFocusable(chosen);
    }
    const candidates = document.querySelectorAll(FOCUSABLE);
    for (let i = 0; i < candidates.length; i++) {
      const el = candidates[i];
      if (target.contains(el) || !isVisible(el)) continue;
      if (target.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) return el;
    }
    const main = document.querySelector('main');
    return main ? makeFocusable(main) : null;
  }

  /* ---------- Gardes globales : boutons occupés ou désactivés ----------
     pointer-events: none ne bloque que la souris : au clavier, Entrée relançait
     l'action d'un bouton .is-loading. On bloque le clic (souris ou clavier) en
     phase de capture, avant les écouteurs de la page. */
  function initGuards() {
    const life = setup(document.documentElement, 'guards');
    if (!life) return;
    document.addEventListener('click', function (e) {
      const blocked = e.target.closest && e.target.closest('.j6n-btn.is-loading, .j6n-btn[aria-disabled="true"], a.is-disabled, a[aria-disabled="true"]');
      if (!blocked) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    }, { capture: true, signal: life.signal });
  }

  /* ---------- Accordéon : groupe exclusif ---------- */
  function initAccordionGroups(root) {
    each(root.querySelectorAll('[data-j6n-js="accordion-group"]'), function (group) {
      const life = setup(group, 'accordion-group');
      if (!life) return;
      each(group.querySelectorAll(':scope > .j6n-accordion__item'), function (item) {
        item.addEventListener('toggle', function () {
          if (!item.open) return;
          each(group.querySelectorAll(':scope > .j6n-accordion__item'), function (other) {
            if (other !== item) other.open = false;
          });
        }, { signal: life.signal });
      });
    });
  }

  /* ---------- Onglets ---------- */
  function initTabs(root) {
    each(root.querySelectorAll('[data-j6n-js="tabs"]'), function (group) {
      const life = setup(group, 'tabs');
      if (!life) return;
      const tabs = Array.prototype.slice.call(group.querySelectorAll('.j6n-tabs__tab'));
      const panels = tabs.map(function (tab) { return document.getElementById(tab.getAttribute('aria-controls')); });

      function select(index, focus) {
        tabs.forEach(function (tab, i) {
          const active = i === index;
          tab.setAttribute('aria-selected', String(active));
          tab.tabIndex = active ? 0 : -1;
          if (panels[i]) panels[i].hidden = !active;
        });
        if (focus) tabs[index].focus();
      }

      tabs.forEach(function (tab, i) {
        tab.addEventListener('click', function () { select(i, false); }, { signal: life.signal });
        tab.addEventListener('keydown', function (e) {
          const last = tabs.length - 1;
          let next = null;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = i === last ? 0 : i + 1;
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = i === 0 ? last : i - 1;
          else if (e.key === 'Home') next = 0;
          else if (e.key === 'End') next = last;
          if (next !== null) { e.preventDefault(); select(next, true); }
        }, { signal: life.signal });
      });

      const current = tabs.findIndex(function (t) { return t.getAttribute('aria-selected') === 'true'; });
      select(current > -1 ? current : 0, false);
    });
  }

  /* ---------- Modale (<dialog> natif) ---------- */
  function initModals(root) {
    each(root.querySelectorAll('[data-j6n-modal-open]'), function (btn) {
      const life = setup(btn, 'modal-open');
      if (!life) return;
      btn.addEventListener('click', function () {
        const dialog = document.getElementById(btn.getAttribute('data-j6n-modal-open'));
        if (dialog) dialog.showModal();
      }, { signal: life.signal });
    });
    each(root.querySelectorAll('dialog.j6n-modal'), function (dialog) {
      const life = setup(dialog, 'modal');
      if (!life) return;
      each(dialog.querySelectorAll('[data-j6n-modal-close]'), function (btn) {
        btn.addEventListener('click', function () { dialog.close(); }, { signal: life.signal });
      });
      dialog.addEventListener('click', function (e) {
        if (e.target === dialog) dialog.close();
      }, { signal: life.signal });
    });
  }

  function openModal(id) { const d = document.getElementById(id); if (d) d.showModal(); }
  function closeModal(id) { const d = document.getElementById(id); if (d) d.close(); }

  /* ---------- Menus déroulants (popover natif) ----------
     Motif « disclosure » : un bouton qui affiche un panneau. Pas de
     aria-haspopup (qui promet un role="menu" et la navigation aux flèches) —
     à poser soi-même si l'on implémente un vrai menu ARIA. */
  function placePopover(trigger, popover) {
    const rect = trigger.getBoundingClientRect();
    const width = popover.offsetWidth || 200;
    const left = Math.min(rect.left, window.innerWidth - width - 8);
    popover.style.position = 'fixed';
    popover.style.top = (rect.bottom + 6) + 'px';
    popover.style.left = Math.max(8, left) + 'px';
  }

  function initDropdowns(root) {
    each(root.querySelectorAll('[popovertarget]'), function (trigger) {
      const popover = document.getElementById(trigger.getAttribute('popovertarget'));
      if (!popover) return;
      const life = setup(trigger, 'popover-trigger');
      if (!life) return;
      trigger.setAttribute('aria-expanded', 'false');
      trigger.setAttribute('aria-controls', popover.id);
      trigger.addEventListener('click', function () { placePopover(trigger, popover); }, { signal: life.signal });
      // reflète l'état ouvert/fermé sur le déclencheur — RGAA 7.3 / WCAG 4.1.2 :
      // ne pas compter uniquement sur l'exposition implicite du Popover API.
      popover.addEventListener('toggle', function (e) {
        const open = e.newState === 'open';
        trigger.setAttribute('aria-expanded', String(open));
        if (!open && popover.contains(document.activeElement)) trigger.focus();
      }, { signal: life.signal });
      window.addEventListener('resize', function () {
        if (popover.matches(':popover-open')) placePopover(trigger, popover);
      }, { signal: life.signal });
    });
  }

  /* ---------- Combobox (saisie + suggestions) ---------- */
  function initCombobox(root) {
    each(root.querySelectorAll('[data-j6n-js="combobox"]'), function (wrap) {
      const life = setup(wrap, 'combobox');
      if (!life) return;
      const opt = { signal: life.signal };
      const input = wrap.querySelector('input');
      const list = wrap.querySelector('.j6n-combobox__list');
      const options = Array.prototype.slice.call(wrap.querySelectorAll('.j6n-combobox__option'));
      const empty = wrap.querySelector('.j6n-combobox__empty');
      let activeIndex = -1;
      let announceTimer = null;

      // rôles ARIA du motif combobox — posés en JS pour rester corrects même si le
      // balisage d'origine les oublie (RGAA 7.3 / WAI-ARIA APG Combobox).
      if (!list.id) list.id = uid('j6n-combobox-list');
      list.setAttribute('role', 'listbox');
      input.setAttribute('role', 'combobox');
      input.setAttribute('aria-autocomplete', 'list');
      input.setAttribute('aria-controls', list.id);
      input.setAttribute('aria-expanded', 'false');
      options.forEach(function (o, i) {
        // sans id, aria-activedescendant ne pourrait désigner l'option active
        if (!o.id) o.id = list.id + '-opt-' + i;
        o.setAttribute('role', 'option');
        o.setAttribute('aria-selected', 'false');
      });
      // une listbox ne contient que des options : le message vide est annoncé à part
      if (empty) empty.setAttribute('aria-hidden', 'true');

      function resetActive() {
        activeIndex = -1;
        input.removeAttribute('aria-activedescendant');
        options.forEach(function (o) { o.setAttribute('aria-selected', 'false'); o.classList.remove('is-active'); });
      }
      function open() {
        placePopover(input, list);
        if (!list.matches(':popover-open')) list.showPopover();
        input.setAttribute('aria-expanded', 'true');
      }
      function close() {
        if (list.matches(':popover-open')) list.hidePopover();
        input.setAttribute('aria-expanded', 'false');
        resetActive();
      }
      function setActive(index) {
        options.forEach(function (o) { o.classList.remove('is-active'); o.setAttribute('aria-selected', 'false'); });
        const visible = options.filter(function (o) { return !o.hidden; });
        if (!visible.length) return;
        activeIndex = ((index % visible.length) + visible.length) % visible.length;
        visible[activeIndex].classList.add('is-active');
        visible[activeIndex].setAttribute('aria-selected', 'true');
        input.setAttribute('aria-activedescendant', visible[activeIndex].id);
      }
      function choose(option) {
        input.value = option.textContent.trim();
        input.dispatchEvent(new Event('change', { bubbles: true }));
        close();
      }

      input.addEventListener('input', function () {
        const q = input.value.trim().toLowerCase();
        let count = 0;
        options.forEach(function (o) {
          const match = !q || o.textContent.toLowerCase().indexOf(q) > -1;
          o.hidden = !match;
          if (match) count++;
        });
        if (empty) empty.hidden = count > 0;
        resetActive();
        open();
        // nombre de résultats annoncé une fois la frappe posée, pas à chaque touche
        clearTimeout(announceTimer);
        announceTimer = setTimeout(function () {
          announce(count === 0 ? 'Aucun résultat' : count === 1 ? '1 suggestion' : count + ' suggestions');
        }, 500);
      }, opt);
      input.addEventListener('focus', open, opt);
      input.addEventListener('blur', close, opt);
      input.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); open(); setActive(activeIndex + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); open(); setActive(activeIndex - 1); }
        else if (e.key === 'Enter') {
          const visible = options.filter(function (o) { return !o.hidden; });
          if (activeIndex > -1 && visible[activeIndex]) { e.preventDefault(); choose(visible[activeIndex]); }
        } else if (e.key === 'Escape') close();
      }, opt);
      options.forEach(function (o) {
        // garde le focus dans le champ au clic : sinon le blur fermerait la liste avant la sélection
        o.addEventListener('mousedown', function (e) { e.preventDefault(); }, opt);
        o.addEventListener('click', function () { choose(o); }, opt);
      });
      // popover « auto » : fermé aussi par le navigateur (clic extérieur) — garder l'état ARIA aligné
      list.addEventListener('toggle', function (e) {
        if (e.newState === 'closed') { input.setAttribute('aria-expanded', 'false'); resetActive(); }
      }, opt);
      life.onDestroy(function () { clearTimeout(announceTimer); });
    });
  }

  /* ---------- Infobulle (RGAA 10.13 / WCAG 1.4.13) ----------
     Le texte de data-tooltip devient un vrai élément, relié par aria-describedby :
     lu comme description et non ajouté au nom du contrôle (ce que faisait le
     ::after). L'infobulle reste affichée quand la souris passe dessus, et Échap
     la masque sans déplacer le focus. */
  const NO_CONTENT = /^(INPUT|IMG|SELECT|TEXTAREA|BR|HR|AREA|EMBED|WBR)$/;

  function hideTooltips(dismiss) {
    each(document.querySelectorAll('[data-tooltip]'), function (el) {
      if (dismiss && el.matches(':hover, :focus-visible, .is-visible')) el.classList.add('is-dismissed');
      el.classList.remove('is-visible');
    });
  }

  function initTooltips(root) {
    const global = setup(document.documentElement, 'tooltip-global');
    if (global) {
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideTooltips(true); }, { signal: global.signal });
      document.addEventListener('click', function () { hideTooltips(false); }, { signal: global.signal });
    }
    const isTouch = matchMedia('(hover: none)').matches;
    each(root.querySelectorAll('[data-tooltip]'), function (el) {
      if (NO_CONTENT.test(el.tagName)) {
        console.warn('[j6n] data-tooltip sur un élément qui ne peut pas contenir l\'infobulle — le poser sur un conteneur ou un bouton :', el);
        return;
      }
      const life = setup(el, 'tooltip');
      if (!life) return;
      const opt = { signal: life.signal };
      const tip = document.createElement('span');
      tip.className = 'j6n-tooltip';
      tip.id = uid('j6n-tooltip');
      // aria-hidden : hors du nom du contrôle ; aria-describedby le lit quand même
      tip.setAttribute('aria-hidden', 'true');
      tip.textContent = el.getAttribute('data-tooltip');
      el.appendChild(tip);
      addToken(el, 'aria-describedby', tip.id);

      // un clic sur l'infobulle ne doit pas déclencher le bouton qui la porte
      tip.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); }, opt);
      el.addEventListener('mouseleave', function () { el.classList.remove('is-dismissed'); }, opt);
      el.addEventListener('focusout', function () { el.classList.remove('is-dismissed', 'is-visible'); }, opt);
      if (isTouch) {
        el.addEventListener('click', function (e) {
          const wasOpen = el.classList.contains('is-visible');
          hideTooltips(false);
          if (!wasOpen) { el.classList.remove('is-dismissed'); el.classList.add('is-visible'); e.stopPropagation(); }
        }, opt);
      }
      life.onDestroy(function () {
        tip.remove();
        removeToken(el, 'aria-describedby', tip.id);
        el.classList.remove('is-visible', 'is-dismissed');
      });
    });
  }

  /* ---------- Mot de passe : visibilité + force ---------- */
  function passwordScore(value) {
    let score = 0;
    if (value.length >= 8) score++;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
    if (/\d/.test(value)) score++;
    if (/[^\w\s]/.test(value)) score++;
    return score;
  }
  function initPassword(root) {
    each(root.querySelectorAll('[data-j6n-js="password"]'), function (wrap) {
      const life = setup(wrap, 'password');
      if (!life) return;
      const input = wrap.querySelector('input');
      const toggle = wrap.querySelector('[data-j6n-password-toggle]');
      const meter = wrap.parentElement.querySelector('.j6n-password__meter');
      const meterLabel = wrap.parentElement.querySelector('.j6n-password__meter-label');
      const labels = ['Très faible', 'Faible', 'Correct', 'Bon', 'Excellent'];
      const classes = ['is-weak', 'is-weak', 'is-fair', 'is-good', 'is-strong'];

      if (toggle) {
        // le libellé dit l'action (Afficher / Masquer) : pas d'aria-pressed en plus,
        // un lecteur d'écran annoncerait « Masquer, enfoncé »
        toggle.removeAttribute('aria-pressed');
        if (!input.id) input.id = uid('j6n-password');
        toggle.setAttribute('aria-controls', input.id);
        toggle.addEventListener('click', function () {
          const showing = input.type === 'text';
          input.type = showing ? 'password' : 'text';
          toggle.textContent = showing ? 'Afficher' : 'Masquer';
        }, { signal: life.signal });
      }
      if (meter) {
        // force annoncée quand elle change de palier, pas à chaque touche
        if (meterLabel) meterLabel.setAttribute('aria-live', 'polite');
        input.addEventListener('input', function () {
          const score = input.value ? passwordScore(input.value) : 0;
          meter.className = 'j6n-password__meter ' + (input.value ? classes[score] : '');
          const text = input.value ? labels[score] : '';
          if (meterLabel && meterLabel.textContent !== text) meterLabel.textContent = text;
        }, { signal: life.signal });
      }
    });
  }

  /* ---------- Curseur ---------- */
  function initRange(root) {
    each(root.querySelectorAll('[data-j6n-js="range"]'), function (input) {
      const life = setup(input, 'range');
      if (!life) return;
      const field = input.closest('.j6n-range-field');
      const output = field ? field.querySelector('.j6n-range-field__value') : null;
      function update() {
        const pct = ((input.value - input.min) / (input.max - input.min)) * 100;
        input.style.setProperty('--_fill', pct + '%');
        if (output) output.textContent = input.value + (input.dataset.unit || '');
      }
      input.addEventListener('input', update, { signal: life.signal });
      update();
    });
  }

  /* ---------- Import de fichiers ---------- */
  function humanSize(bytes) {
    if (bytes < 1024) return bytes + ' o';
    const units = ['Ko', 'Mo', 'Go'];
    let i = -1;
    do { bytes /= 1024; i++; } while (bytes >= 1024 && i < units.length - 1);
    return bytes.toFixed(1) + ' ' + units[i];
  }
  function initUpload(root) {
    each(root.querySelectorAll('[data-j6n-js="upload"]'), function (zone) {
      const life = setup(zone, 'upload');
      if (!life) return;
      const opt = { signal: life.signal };
      const input = zone.querySelector('input[type="file"]');
      const trigger = zone.querySelector('[data-j6n-upload-trigger]');
      const list = zone.parentElement.querySelector('.j6n-upload__list') || zone.querySelector('.j6n-upload__list');

      if (trigger) {
        // le bouton visible ouvre le sélecteur : le champ masqué sort de l'ordre de
        // tabulation, sinon il créait un arrêt invisible en doublon (RGAA 10.7)
        input.tabIndex = -1;
        trigger.addEventListener('click', function () { input.click(); }, opt);
      }

      function summary(count) {
        return count === 0 ? 'Aucun fichier sélectionné' : count === 1 ? '1 fichier sélectionné' : count + ' fichiers sélectionnés';
      }

      function render(files, focusIndex) {
        if (!list) return;
        list.innerHTML = '';
        const removes = [];
        each(files, function (file, i) {
          const row = document.createElement('div');
          row.className = 'j6n-upload__item';
          const name = document.createElement('span');
          name.className = 'j6n-upload__item-name';
          name.textContent = file.name;
          const size = document.createElement('span');
          size.className = 'j6n-upload__item-size';
          size.textContent = humanSize(file.size);
          const remove = document.createElement('button');
          remove.type = 'button';
          remove.className = 'j6n-close';
          remove.setAttribute('aria-label', 'Retirer ' + file.name);
          remove.textContent = '×';
          remove.addEventListener('click', function () {
            const dt = new DataTransfer();
            each(input.files, function (f, j) { if (j !== i) dt.items.add(f); });
            input.files = dt.files;
            render(input.files, i);
            announce(file.name + ' retiré. ' + summary(input.files.length) + '.');
          });
          row.appendChild(name); row.appendChild(size); row.appendChild(remove);
          list.appendChild(row);
          removes.push(remove);
        });
        // le bouton cliqué a disparu : focus sur la ligne suivante, sinon sur le déclencheur
        if (focusIndex !== undefined) {
          const next = removes[Math.min(focusIndex, removes.length - 1)];
          if (next) next.focus();
          else (trigger || makeFocusable(zone)).focus();
        }
      }

      input.addEventListener('change', function () {
        render(input.files);
        announce(summary(input.files.length));
      }, opt);
      ['dragenter', 'dragover'].forEach(function (evt) {
        zone.addEventListener(evt, function (e) { e.preventDefault(); zone.classList.add('is-dragover'); }, opt);
      });
      ['dragleave', 'drop'].forEach(function (evt) {
        zone.addEventListener(evt, function (e) { e.preventDefault(); zone.classList.remove('is-dragover'); }, opt);
      });
      zone.addEventListener('drop', function (e) {
        if (e.dataTransfer && e.dataTransfer.files.length) {
          input.files = e.dataTransfer.files;
          render(input.files);
          announce(summary(input.files.length));
        }
      }, opt);
    });
  }

  /* ---------- Bandeaux : notice / consentement (mémorisés) ----------
     data-j6n-dismiss="clé" mémorise la fermeture ; data-j6n-dismiss-value
     précise la valeur enregistrée (ex. "accepte" / "refuse" pour un
     consentement), relue avec j6n.dismissed("clé") et diffusée dans
     l'évènement j6n:dismiss. data-j6n-dismiss-focus="sélecteur" choisit où
     va le focus après fermeture (par défaut : l'élément focalisable suivant). */
  function initDismiss(root) {
    each(root.querySelectorAll('[data-j6n-dismiss], [data-j6n-dismiss-target]'), function (btn) {
      const key = btn.getAttribute('data-j6n-dismiss');
      const targetId = btn.getAttribute('data-j6n-dismiss-target');
      const target = targetId ? document.getElementById(targetId) : btn.closest('.j6n-notice, .j6n-consent, .j6n-alert');
      if (!target) return;
      const life = setup(btn, 'dismiss');
      if (!life) return;
      if (key && storage.get(key) !== null) { target.hidden = true; return; }
      btn.addEventListener('click', function () {
        const value = btn.getAttribute('data-j6n-dismiss-value') || '1';
        // le bouton va disparaître avec le bandeau : préparer la suite du parcours clavier (WCAG 2.4.3)
        const next = target.contains(document.activeElement) ? focusAfter(target, btn.getAttribute('data-j6n-dismiss-focus')) : null;
        target.hidden = true;
        if (key) storage.set(key, value);
        target.dispatchEvent(new CustomEvent('j6n:dismiss', { bubbles: true, detail: { key: key, value: value } }));
        if (next) next.focus();
      }, { signal: life.signal });
    });
  }
  function dismissed(key) { return storage.get(key); }

  /* ---------- Sommaire : suivi de défilement ---------- */
  function initToc(root) {
    each(root.querySelectorAll('[data-j6n-js="toc"]'), function (toc) {
      const links = Array.prototype.slice.call(toc.querySelectorAll('a[href^="#"]'));
      const targets = links
        .map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
        .filter(Boolean);
      if (!targets.length || !('IntersectionObserver' in window)) return;
      const life = setup(toc, 'toc');
      if (!life) return;
      const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          links.forEach(function (a) { a.classList.remove('is-current'); });
          const link = links[targets.indexOf(entry.target)];
          if (link) link.classList.add('is-current');
        });
      }, { rootMargin: '-20% 0px -70% 0px' });
      targets.forEach(function (t) { observer.observe(t); });
      life.onDestroy(function () { observer.disconnect(); });
    });
  }

  /* ---------- Tableau : zone de défilement accessible au clavier ----------
     .j6n-table-wrap défile horizontalement sur petit écran : il doit pouvoir
     recevoir le focus pour défiler aux flèches, et être nommé (RGAA 7.1). */
  function initTableWraps(root) {
    each(root.querySelectorAll('.j6n-table-wrap'), function (wrap) {
      if (!bind(wrap, 'table-wrap')) return;
      if (!wrap.hasAttribute('tabindex')) wrap.tabIndex = 0;
      if (!wrap.hasAttribute('role')) wrap.setAttribute('role', 'region');
      if (!wrap.hasAttribute('aria-label') && !wrap.hasAttribute('aria-labelledby')) {
        const caption = wrap.querySelector('caption');
        if (caption) {
          if (!caption.id) caption.id = uid('j6n-caption');
          wrap.setAttribute('aria-labelledby', caption.id);
        }
      }
    });
  }

  /* ---------- Tableau triable ---------- */
  function initTableSort(root) {
    each(root.querySelectorAll('[data-j6n-js="table-sort"]'), function (table) {
      const life = setup(table, 'table-sort');
      if (!life) return;
      const tbody = table.querySelector('tbody');
      each(table.querySelectorAll('.j6n-table__sort'), function (btn) {
        btn.addEventListener('click', function () {
          const th = btn.closest('th');
          const index = Array.prototype.indexOf.call(th.parentElement.children, th);
          const asc = th.getAttribute('aria-sort') !== 'ascending';
          each(table.querySelectorAll('.j6n-table__sort'), function (b) { b.closest('th').removeAttribute('aria-sort'); });
          th.setAttribute('aria-sort', asc ? 'ascending' : 'descending');
          const rows = Array.prototype.slice.call(tbody.querySelectorAll('tr'));
          const numeric = th.hasAttribute('data-numeric');
          rows.sort(function (a, b) {
            let av = a.children[index].textContent.trim();
            let bv = b.children[index].textContent.trim();
            if (numeric) { av = parseFloat(av.replace(',', '.')) || 0; bv = parseFloat(bv.replace(',', '.')) || 0; }
            if (av < bv) return asc ? -1 : 1;
            if (av > bv) return asc ? 1 : -1;
            return 0;
          });
          rows.forEach(function (r) { tbody.appendChild(r); });
          announce('Tableau trié par ' + btn.textContent.trim() + ', ordre ' + (asc ? 'croissant' : 'décroissant') + '.');
        }, { signal: life.signal });
      });
    });
  }

  /* ---------- Menu mobile du header ---------- */
  function initMenuToggle(root) {
    each(root.querySelectorAll('[data-j6n-js="menu-toggle"]'), function (btn) {
      const header = btn.closest('.j6n-header');
      const nav = header ? header.querySelector('.j6n-nav') : null;
      if (!nav) return;
      const life = setup(btn, 'menu-toggle');
      if (!life) return;
      const opt = { signal: life.signal };
      if (!nav.id) nav.id = uid('j6n-nav');
      btn.setAttribute('aria-controls', nav.id);
      function set(open) {
        nav.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
      }
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const open = !nav.classList.contains('is-open');
        set(open);
        if (open) {
          const first = nav.querySelector('a, button');
          if (first) first.focus();
        }
      }, opt);
      nav.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); }, opt);
      // quitter le menu ouvert au clavier (Tab) le referme, comme un clic à l'extérieur
      nav.addEventListener('focusout', function (e) {
        if (!nav.classList.contains('is-open')) return;
        const to = e.relatedTarget;
        if (to && !nav.contains(to) && to !== btn) set(false);
      }, opt);
      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape' || !nav.classList.contains('is-open')) return;
        set(false);
        btn.focus();
      }, opt);
      document.addEventListener('click', function (e) {
        if (nav.classList.contains('is-open') && !nav.contains(e.target)) set(false);
      }, opt);
    });
  }

  /* ---------- Bascule d'unités ---------- */
  function initUnitSwitch(root) {
    each(root.querySelectorAll('[data-j6n-js="unit-switch"]'), function (group) {
      const life = setup(group, 'unit-switch');
      if (!life) return;
      each(group.querySelectorAll('input[type="radio"]'), function (input) {
        input.addEventListener('change', function () {
          if (!input.checked) return;
          document.dispatchEvent(new CustomEvent('j6n:unit-change', { detail: { unit: input.value } }));
        }, { signal: life.signal });
      });
    });
  }

  /* ---------- Carrousel (WAI-ARIA APG Carousel · RGAA 13.8 / WCAG 2.2.2) ----------
     Chaque réglage se passe en data-j6n-* sur le carrousel ou en option de
     j6n.carousel(el, options) — l'option JS l'emporte sur l'attribut. Les
     invariants d'accessibilité ne sont pas réglables : pause au survol des
     diapositives, arrêt dès que le focus entre dans le carrousel, diapositives
     masquées inertes, pas de lecture automatique si prefers-reduced-motion. */
  const CAROUSEL_DEFAULTS = {
    autoplay: false,     // défilement automatique
    delay: 6000,         // temps d'affichage d'une diapositive (ms, ou "6s") — surchargeable par diapositive
    transition: 'slide', // 'slide' | 'fade' | 'none'
    duration: null,      // durée de la transition (ms) — null : --j6n-dur-3
    easing: null,        // courbe CSS — null : --j6n-ease
    loop: true,          // revenir au début après la dernière diapositive
    rotations: 0,        // nombre de tours avant arrêt automatique (0 : illimité)
    start: 0,            // diapositive de départ (index à partir de 0)
    swipe: true,         // glissement tactile
    progress: true       // barre de temps restant
  };
  const CAROUSEL_MIN_DELAY = 1000;
  const carousels = new WeakMap();

  function parseTime(value) {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'number') return value;
    const str = String(value).trim();
    const n = parseFloat(str);
    if (isNaN(n)) return undefined;
    return /(^|[^m])s$/.test(str) ? n * 1000 : n;
  }
  function parseBool(value) { return value === undefined ? undefined : value !== 'false'; }

  function carouselDataOptions(el) {
    const d = el.dataset;
    let transition = d.j6nTransition;
    if (!transition && el.classList.contains('j6n-carousel--fade')) transition = 'fade';
    if (!transition && el.classList.contains('j6n-carousel--none')) transition = 'none';
    return {
      autoplay: parseBool(d.j6nAutoplay),
      delay: parseTime(d.j6nDelay),
      transition: transition,
      duration: parseTime(d.j6nDuration),
      easing: d.j6nEasing,
      loop: parseBool(d.j6nLoop),
      rotations: d.j6nRotations !== undefined ? parseInt(d.j6nRotations, 10) || 0 : undefined,
      start: d.j6nStart !== undefined ? parseInt(d.j6nStart, 10) || 0 : undefined,
      swipe: parseBool(d.j6nSwipe),
      progress: parseBool(d.j6nProgress)
    };
  }

  function mergeOptions(base, extra) {
    const out = {};
    Object.keys(CAROUSEL_DEFAULTS).forEach(function (key) {
      const value = extra && extra[key] !== undefined ? extra[key] : base[key];
      out[key] = key === 'delay' || key === 'duration' ? parseTime(value) : value;
    });
    if (out.delay === undefined) out.delay = CAROUSEL_DEFAULTS.delay;
    return out;
  }

  function createCarousel(el, options, life) {
    const opt = { signal: life.signal };
    const viewport = el.querySelector('.j6n-carousel__viewport');
    const track = el.querySelector('.j6n-carousel__track');
    const slides = Array.prototype.filter.call(track.children, function (s) { return s.classList.contains('j6n-carousel__slide'); });
    const toolbar = el.querySelector('.j6n-carousel__toolbar');
    const playBtn = el.querySelector('[data-j6n-carousel-play]');
    const playLabel = playBtn ? playBtn.querySelector('.j6n-carousel__play-label') : null;
    const prevBtn = el.querySelector('[data-j6n-carousel-prev]');
    const nextBtn = el.querySelector('[data-j6n-carousel-next]');
    const counter = el.querySelector('.j6n-carousel__counter');
    const progress = el.querySelector('.j6n-carousel__progress');
    const bar = progress ? progress.querySelector('.j6n-carousel__progress-bar') : null;
    const dotsWrap = el.querySelector('.j6n-carousel__dots');
    const total = slides.length;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    let opts = mergeOptions(mergeOptions(CAROUSEL_DEFAULTS, carouselDataOptions(el)), options);
    let index = 0;
    let stopped = reducedMotion;   // arrêt explicite (bouton, focus, glissement, fin des tours)
    let hovered = false;
    let pageHidden = document.hidden;
    let timer = null;
    let startedAt = 0;
    let remaining = 0;
    let advances = 0;
    let wasRunning = null;

    // ARIA : déjà attendu dans le HTML source, reconfirmé ici en filet de sécurité.
    if (!el.hasAttribute('aria-roledescription')) el.setAttribute('aria-roledescription', 'carrousel');
    if (!el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby')) {
      console.warn('[j6n] carrousel sans aria-label ni aria-labelledby (RGAA 13.8) :', el);
    }
    if (!track.id) track.id = uid('j6n-carousel');
    slides.forEach(function (slide, i) {
      slide.setAttribute('role', 'group');
      if (!slide.hasAttribute('aria-roledescription')) slide.setAttribute('aria-roledescription', 'diapositive');
      if (!slide.hasAttribute('aria-label') && !slide.hasAttribute('aria-labelledby')) slide.setAttribute('aria-label', (i + 1) + ' sur ' + total);
    });
    [prevBtn, nextBtn].forEach(function (btn) { if (btn) btn.setAttribute('aria-controls', track.id); });

    let dots = [];
    if (dotsWrap) {
      if (!dotsWrap.children.length) {
        slides.forEach(function (slide, i) {
          const dot = document.createElement('button');
          dot.type = 'button';
          dot.className = 'j6n-carousel__dot';
          dot.setAttribute('aria-label', 'Diapositive ' + (i + 1) + ' sur ' + total);
          dotsWrap.appendChild(dot);
        });
      }
      if (!dotsWrap.hasAttribute('role')) dotsWrap.setAttribute('role', 'group');
      if (!dotsWrap.hasAttribute('aria-label')) dotsWrap.setAttribute('aria-label', 'Choisir une diapositive');
      dots = Array.prototype.slice.call(dotsWrap.querySelectorAll('.j6n-carousel__dot'));
      dots.forEach(function (dot, i) {
        dot.setAttribute('aria-controls', track.id);
        dot.addEventListener('click', function () { pause(); goTo(i); }, opt);
      });
    }

    function slideDelay(i) {
      const own = parseTime(slides[i].dataset.j6nDelay);
      return Math.max(CAROUSEL_MIN_DELAY, own !== undefined ? own : opts.delay);
    }
    function clearTimer() {
      if (timer) { clearTimeout(timer); timer = null; }
    }
    function restartProgress() {
      if (!bar) return;
      bar.style.animation = 'none';
      void bar.offsetWidth;
      bar.style.animation = '';
    }

    function applyOptions() {
      el.classList.remove('j6n-carousel--fade', 'j6n-carousel--none');
      if (opts.transition === 'fade' || opts.transition === 'none') el.classList.add('j6n-carousel--' + opts.transition);
      if (opts.duration !== undefined && opts.duration !== null) el.style.setProperty('--j6n-carousel-duration', opts.duration + 'ms');
      else el.style.removeProperty('--j6n-carousel-duration');
      if (opts.easing) el.style.setProperty('--j6n-carousel-easing', opts.easing);
      else el.style.removeProperty('--j6n-carousel-easing');
      const auto = opts.autoplay && total > 1;
      if (playBtn) playBtn.hidden = !auto;
      if (progress) progress.hidden = !auto || !opts.progress;
      if (toolbar) toolbar.hidden = total < 2;
      if (dotsWrap) dotsWrap.hidden = total < 2;
    }

    function render() {
      slides.forEach(function (slide, i) {
        const active = i === index;
        slide.classList.toggle('is-active', active);
        // inert : ni focus ni lecture d'écran dans les diapositives hors champ (RGAA 10.8 / 12.8)
        slide.inert = !active;
        if (active) slide.removeAttribute('aria-hidden');
        else slide.setAttribute('aria-hidden', 'true');
      });
      track.style.transform = 'translateX(' + (-index * 100) + '%)';
      dots.forEach(function (dot, i) {
        if (i === index) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
      if (counter) counter.textContent = (index + 1) + ' / ' + total;
      if (prevBtn) prevBtn.setAttribute('aria-disabled', String(!opts.loop && index === 0));
      if (nextBtn) nextBtn.setAttribute('aria-disabled', String(!opts.loop && index === total - 1));
      el.style.setProperty('--j6n-carousel-delay', slideDelay(index) + 'ms');
      restartProgress();
    }

    // Un seul endroit décide si le temps s'écoule : lecture demandée, non arrêtée,
    // et ni survolée ni dans un onglet masqué.
    function sync() {
      const running = opts.autoplay && total > 1 && !stopped;
      const held = hovered || pageHidden;
      el.classList.toggle('is-running', running);
      el.classList.toggle('is-held', running && held);
      el.classList.toggle('is-stopped', !running);
      // annonce des changements seulement quand ils viennent de l'utilisateur (APG)
      track.setAttribute('aria-live', running ? 'off' : 'polite');
      if (playLabel) playLabel.textContent = running ? 'Pause' : 'Lecture';
      if (running && !held) {
        if (!timer) {
          const wait = remaining > 0 ? remaining : slideDelay(index);
          startedAt = Date.now();
          remaining = wait;
          timer = setTimeout(tick, wait);
        }
      } else if (timer) {
        clearTimer();
        remaining = running ? Math.max(0, remaining - (Date.now() - startedAt)) : 0;
      }
      if (running !== wasRunning) {
        wasRunning = running;
        el.dispatchEvent(new CustomEvent('j6n:carousel-state', { bubbles: true, detail: { playing: running } }));
      }
    }

    function tick() {
      timer = null;
      remaining = 0;
      const last = index === total - 1;
      if (last && !opts.loop) { pause(); return; }
      advances++;
      goTo(last ? 0 : index + 1);
      if (opts.rotations > 0 && advances >= opts.rotations * total) pause();
    }

    function goTo(i) {
      if (!total) return;
      const target = opts.loop ? ((i % total) + total) % total : Math.max(0, Math.min(total - 1, i));
      const changed = target !== index;
      index = target;
      clearTimer();
      remaining = 0;
      render();
      if (changed) el.dispatchEvent(new CustomEvent('j6n:carousel-change', { bubbles: true, detail: { index: index, total: total, slide: slides[index] } }));
      sync();
    }
    function play() {
      if (!opts.autoplay) { opts.autoplay = true; applyOptions(); }
      stopped = false;
      advances = 0;
      restartProgress();
      sync();
    }
    function pause() {
      stopped = true;
      sync();
    }
    function set(newOptions) {
      opts = mergeOptions(opts, newOptions);
      applyOptions();
      clearTimer();
      remaining = 0;
      if (newOptions && newOptions.start !== undefined) goTo(opts.start);
      else { render(); sync(); }
    }

    if (playBtn) playBtn.addEventListener('click', function () { if (el.classList.contains('is-running')) pause(); else play(); }, opt);
    if (prevBtn) prevBtn.addEventListener('click', function () {
      if (prevBtn.getAttribute('aria-disabled') === 'true') return;
      pause(); goTo(index - 1);
    }, opt);
    if (nextBtn) nextBtn.addEventListener('click', function () {
      if (nextBtn.getAttribute('aria-disabled') === 'true') return;
      pause(); goTo(index + 1);
    }, opt);
    // focus dans le carrousel (hors bouton lecture/pause) : arrêt, sans reprise implicite (APG)
    el.addEventListener('focusin', function (e) {
      if (playBtn && playBtn.contains(e.target)) return;
      if (el.classList.contains('is-running')) pause();
    }, opt);
    // survol des diapositives seulement : la barre d'outils reste réactive au clic
    viewport.addEventListener('mouseenter', function () { hovered = true; sync(); }, opt);
    viewport.addEventListener('mouseleave', function () { hovered = false; sync(); }, opt);
    document.addEventListener('visibilitychange', function () { pageHidden = document.hidden; sync(); }, opt);

    let swipeX = null;
    let swipeY = 0;
    viewport.addEventListener('pointerdown', function (e) {
      if (!opts.swipe || e.pointerType === 'mouse') return;
      swipeX = e.clientX;
      swipeY = e.clientY;
    }, opt);
    viewport.addEventListener('pointerup', function (e) {
      if (swipeX === null) return;
      const dx = e.clientX - swipeX;
      const dy = e.clientY - swipeY;
      swipeX = null;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
      const target = index + (dx < 0 ? 1 : -1);
      if (!opts.loop && (target < 0 || target >= total)) return;
      pause();
      goTo(target);
    }, opt);
    viewport.addEventListener('pointercancel', function () { swipeX = null; }, opt);

    el.classList.add('is-initializing');
    applyOptions();
    index = Math.max(0, Math.min(total - 1, opts.start || 0));
    render();
    sync();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { el.classList.remove('is-initializing'); });
    });

    const api = {
      next: function () { goTo(index + 1); },
      prev: function () { goTo(index - 1); },
      goTo: goTo,
      play: play,
      pause: pause,
      set: set,
      get index() { return index; },
      get total() { return total; },
      get playing() { return el.classList.contains('is-running'); },
      get options() { return Object.assign({}, opts); }
    };
    carousels.set(el, api);
    life.onDestroy(function () {
      clearTimer();
      el.classList.remove('is-running', 'is-held');
      carousels.delete(el);
    });
    return api;
  }

  function carousel(target, options) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return null;
    const existing = carousels.get(el);
    if (existing) { if (options) existing.set(options); return existing; }
    const life = setup(el, 'carousel');
    return life ? createCarousel(el, options, life) : null;
  }

  function initCarousels(root) {
    each(root.querySelectorAll('[data-j6n-js="carousel"]'), function (el) {
      const life = setup(el, 'carousel');
      if (!life) return;
      createCarousel(el, undefined, life);
    });
  }

  /* ---------- Toasts ----------
     L'annonce passe par les zones live (assertive pour une erreur). Le toast
     reste affiché tant que la souris est dessus ou que le focus y est
     (WCAG 2.2.1) ; une erreur (tone: 'danger') ne disparaît pas seule.
     duration: 0 → reste jusqu'à fermeture. */
  function toastRegion() {
    let region = document.getElementById('j6n-toast-region');
    if (!region) {
      region = document.createElement('div');
      region.id = 'j6n-toast-region';
      document.body.appendChild(region);
    }
    return region;
  }
  function toast(message, opts) {
    opts = opts || {};
    const urgent = opts.tone === 'danger';
    const duration = opts.duration !== undefined ? opts.duration : (urgent ? 0 : 6000);
    const el = document.createElement('div');
    el.className = 'j6n-toast' + (opts.tone ? ' j6n-toast--' + opts.tone : '');
    const text = document.createElement('span');
    text.textContent = message;
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'j6n-toast__close';
    close.setAttribute('aria-label', 'Fermer la notification');
    close.textContent = '×';
    el.appendChild(text);
    el.appendChild(close);
    toastRegion().appendChild(el);
    announce(message, { assertive: urgent });

    let timer = null;
    let remaining = duration;
    let startedAt = 0;
    let hovered = false;
    let focused = false;
    let returnFocus = null;
    let gone = false;

    function run() {
      if (!duration || gone || hovered || focused || timer) return;
      startedAt = Date.now();
      timer = setTimeout(dismiss, remaining);
    }
    function hold() {
      if (!timer) return;
      clearTimeout(timer);
      timer = null;
      remaining = Math.max(1000, remaining - (Date.now() - startedAt));
    }
    function dismiss() {
      if (gone) return;
      gone = true;
      clearTimeout(timer);
      if (el.contains(document.activeElement) && returnFocus && returnFocus.isConnected) returnFocus.focus();
      el.classList.add('is-leaving');
      const remove = function () { el.remove(); };
      el.addEventListener('animationend', remove, { once: true });
      setTimeout(remove, 600); // filet si aucune animation ne tourne
    }

    el.addEventListener('mouseenter', function () { hovered = true; hold(); });
    el.addEventListener('mouseleave', function () { hovered = false; run(); });
    el.addEventListener('focusin', function (e) {
      if (!focused && e.relatedTarget && !el.contains(e.relatedTarget)) returnFocus = e.relatedTarget;
      focused = true;
      hold();
    });
    el.addEventListener('focusout', function (e) {
      if (el.contains(e.relatedTarget)) return;
      focused = false;
      run();
    });
    close.addEventListener('click', dismiss);
    run();
    return el;
  }

  /* ---------- Champs : association automatique des messages (RGAA 11.9 / WCAG 3.3.1) ---------- */
  function initFieldDescriptions(root) {
    each(root.querySelectorAll('.j6n-field, .j6n-range-field'), function (field) {
      if (!bind(field, 'field-describe')) return;
      const control = field.querySelector('input, select, textarea');
      if (!control) return;
      const describers = field.querySelectorAll('.j6n-hint, .j6n-field__count, .j6n-password__meter-label');
      describers.forEach(function (el, i) {
        // liés même si vides pour l'instant (ex. le score du mot de passe se remplit
        // au fil de la saisie) : la relation doit exister dès le départ.
        if (!el.id) el.id = (control.id || 'j6n-field') + '-desc-' + i;
        addToken(control, 'aria-describedby', el.id);
      });
    });
  }

  /* ---------- Amorçage ---------- */
  function init(root) {
    root = root || document;
    ensureLiveRegions();
    initGuards();
    initFieldDescriptions(root);
    initAccordionGroups(root);
    initTabs(root);
    initModals(root);
    initDropdowns(root);
    initCombobox(root);
    initTooltips(root);
    initPassword(root);
    initRange(root);
    initUpload(root);
    initDismiss(root);
    initToc(root);
    initTableWraps(root);
    initTableSort(root);
    initMenuToggle(root);
    initUnitSwitch(root);
    initCarousels(root);
  }

  /* ---------- Signal de migration 0.1.x → 0.2 ----------
     Une seule fois par page, après chargement complet (feuilles de style et
     polices déclarées) : si un usage de l'ancienne version est repéré, un
     avertissement en console liste les points et renvoie vers
     « npx design-j6n migrate ». Rien n'est affiché sinon.
     Le faire taire (ex. polices système voulues) : <html data-j6n-quiet>. */
  function legacyFindings() {
    const found = [];
    let hasFonts = false;
    if (document.fonts && document.fonts.forEach) {
      document.fonts.forEach(function (face) {
        if (/^["']?(Sora|Inter)["']?$/.test(face.family)) hasFonts = true;
      });
    }
    if (!hasFonts) found.push('Polices : fonts.css n\'est pas chargé — theme.css n\'importe plus Google Fonts, le texte s\'affiche en police système.');
    function check(selector, message) {
      try { if (document.querySelector(selector)) found.push(message); } catch (e) { /* sélecteur non pris en charge */ }
    }
    check('[popovertarget][aria-haspopup="true"]', 'Menu déroulant : retirer aria-haspopup="true" des déclencheurs popover.');
    check('.j6n-consent [data-j6n-dismiss]:not([data-j6n-dismiss-value])', 'Consentement : ajouter data-j6n-dismiss-value="accepte" / "refuse" aux boutons.');
    check('.j6n-stepper:not(ol)', 'Étapes : .j6n-stepper doit être une <ol> (avec aria-current="step").');
    check('ul.j6n-pagination:not(nav ul)', 'Pagination : envelopper la <ul> dans <nav aria-label="Pagination">.');
    check('blockquote.j6n-quote', 'Citation : passer à <figure class="j6n-quote"> + <figcaption>.');
    return found;
  }
  function warnLegacy() {
    if (document.documentElement.hasAttribute('data-j6n-quiet')) return;
    const found = legacyFindings();
    if (!found.length) return;
    console.warn('[j6n] Usage antérieur à la 0.2 détecté :\n- ' + found.join('\n- ') +
      '\nLancer « npx design-j6n migrate » dans le projet pour la liste complète et les corrections automatiques (--write). ' +
      'Masquer ce message : <html data-j6n-quiet>.');
  }
  if (document.readyState === 'complete') setTimeout(warnLegacy, 0);
  else window.addEventListener('load', warnLegacy, { once: true });

  document.documentElement.setAttribute('data-j6n', 'true');
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(document); });
  } else {
    init(document);
  }

  window.j6n = {
    init: init,
    destroy: destroy,
    toast: toast,
    announce: announce,
    openModal: openModal,
    closeModal: closeModal,
    carousel: carousel,
    dismissed: dismissed
  };
})();
