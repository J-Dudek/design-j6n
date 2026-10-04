/* ============================================================
   FOULÉE — contrôles & dynamisme
   Aucune dépendance, aucun build. Charger après le DOM ou en fin
   de <body> : <script src="theme.js"></script>
   S'appuie sur les éléments natifs (<details>, <dialog>, popover)
   plutôt que de tout réimplémenter en JS.
   API publique : window.j6n.init(root), j6n.toast(msg, opts),
   j6n.openModal(id), j6n.closeModal(id).
   ============================================================ */
(function () {
  'use strict';

  const BOUND = 'j6nBound';

  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function bind(el, key) {
    if (el.dataset[BOUND] && el.dataset[BOUND].indexOf(key) > -1) return false;
    el.dataset[BOUND] = (el.dataset[BOUND] || '') + ' ' + key;
    return true;
  }

  /* ---------- Accordéon : groupe exclusif ---------- */
  function initAccordionGroups(root) {
    each(root.querySelectorAll('[data-j6n-js="accordion-group"]'), function (group) {
      if (!bind(group, 'accordion-group')) return;
      each(group.querySelectorAll(':scope > .j6n-accordion__item'), function (item) {
        item.addEventListener('toggle', function () {
          if (!item.open) return;
          each(group.querySelectorAll(':scope > .j6n-accordion__item'), function (other) {
            if (other !== item) other.open = false;
          });
        });
      });
    });
  }

  /* ---------- Onglets ---------- */
  function initTabs(root) {
    each(root.querySelectorAll('[data-j6n-js="tabs"]'), function (group) {
      if (!bind(group, 'tabs')) return;
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
        tab.addEventListener('click', function () { select(i, false); });
        tab.addEventListener('keydown', function (e) {
          const last = tabs.length - 1;
          let next = null;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = i === last ? 0 : i + 1;
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = i === 0 ? last : i - 1;
          else if (e.key === 'Home') next = 0;
          else if (e.key === 'End') next = last;
          if (next !== null) { e.preventDefault(); select(next, true); }
        });
      });

      const current = tabs.findIndex(function (t) { return t.getAttribute('aria-selected') === 'true'; });
      select(current > -1 ? current : 0, false);
    });
  }

  /* ---------- Modale (<dialog> natif) ---------- */
  function initModals(root) {
    each(root.querySelectorAll('[data-j6n-modal-open]'), function (btn) {
      if (!bind(btn, 'modal-open')) return;
      btn.addEventListener('click', function () {
        const dialog = document.getElementById(btn.getAttribute('data-j6n-modal-open'));
        if (dialog) dialog.showModal();
      });
    });
    each(root.querySelectorAll('dialog.j6n-modal'), function (dialog) {
      if (!bind(dialog, 'modal')) return;
      each(dialog.querySelectorAll('[data-j6n-modal-close]'), function (btn) {
        btn.addEventListener('click', function () { dialog.close(); });
      });
      dialog.addEventListener('click', function (e) {
        if (e.target === dialog) dialog.close();
      });
    });
  }

  function openModal(id) { const d = document.getElementById(id); if (d) d.showModal(); }
  function closeModal(id) { const d = document.getElementById(id); if (d) d.close(); }

  /* ---------- Menus déroulants (popover natif) : positionnement ---------- */
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
      if (!bind(trigger, 'popover-trigger')) return;
      const popover = document.getElementById(trigger.getAttribute('popovertarget'));
      if (!popover) return;
      if (!trigger.hasAttribute('aria-haspopup')) trigger.setAttribute('aria-haspopup', 'true');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.addEventListener('click', function () { placePopover(trigger, popover); });
      // reflète l'état ouvert/fermé sur le déclencheur — RGAA 7.3 / WCAG 4.1.2 :
      // ne pas compter uniquement sur l'exposition implicite du Popover API.
      popover.addEventListener('toggle', function (e) {
        const open = e.newState === 'open';
        trigger.setAttribute('aria-expanded', String(open));
        if (!open && popover.contains(document.activeElement)) trigger.focus();
      });
      window.addEventListener('resize', function () {
        if (popover.matches(':popover-open')) placePopover(trigger, popover);
      });
    });
  }

  /* ---------- Combobox (saisie + suggestions) ---------- */
  function initCombobox(root) {
    each(root.querySelectorAll('[data-j6n-js="combobox"]'), function (wrap) {
      if (!bind(wrap, 'combobox')) return;
      const input = wrap.querySelector('input');
      const list = wrap.querySelector('.j6n-combobox__list');
      const options = Array.prototype.slice.call(wrap.querySelectorAll('.j6n-combobox__option'));
      let activeIndex = -1;

      // rôles ARIA du motif combobox — posés en JS pour rester corrects même si le
      // balisage d'origine les oublie (RGAA 7.3 / WAI-ARIA APG Combobox).
      if (!list.id) list.id = 'j6n-combobox-list-' + Math.random().toString(36).slice(2, 8);
      list.setAttribute('role', 'listbox');
      input.setAttribute('aria-controls', list.id);
      input.setAttribute('aria-expanded', 'false');
      options.forEach(function (o) {
        o.setAttribute('role', 'option');
        o.setAttribute('aria-selected', 'false');
      });

      function open() {
        placePopover(input, list);
        if (!list.matches(':popover-open')) list.showPopover();
        input.setAttribute('aria-expanded', 'true');
      }
      function close() {
        if (list.matches(':popover-open')) list.hidePopover();
        activeIndex = -1;
        input.setAttribute('aria-expanded', 'false');
        input.removeAttribute('aria-activedescendant');
        options.forEach(function (o) { o.setAttribute('aria-selected', 'false'); o.classList.remove('is-active'); });
      }
      function setActive(index) {
        options.forEach(function (o) { o.classList.remove('is-active'); o.setAttribute('aria-selected', 'false'); });
        const visible = options.filter(function (o) { return !o.hidden; });
        if (!visible.length) return;
        activeIndex = ((index % visible.length) + visible.length) % visible.length;
        visible[activeIndex].classList.add('is-active');
        visible[activeIndex].setAttribute('aria-selected', 'true');
        input.setAttribute('aria-activedescendant', visible[activeIndex].id || '');
      }
      function choose(option) {
        input.value = option.textContent.trim();
        input.dispatchEvent(new Event('change', { bubbles: true }));
        close();
      }

      input.addEventListener('input', function () {
        const q = input.value.trim().toLowerCase();
        let any = false;
        options.forEach(function (o) {
          const match = !q || o.textContent.toLowerCase().indexOf(q) > -1;
          o.hidden = !match;
          if (match) any = true;
        });
        const empty = wrap.querySelector('.j6n-combobox__empty');
        if (empty) empty.hidden = any;
        open();
      });
      input.addEventListener('focus', open);
      input.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); open(); setActive(activeIndex + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); open(); setActive(activeIndex - 1); }
        else if (e.key === 'Enter') {
          const visible = options.filter(function (o) { return !o.hidden; });
          if (activeIndex > -1 && visible[activeIndex]) { e.preventDefault(); choose(visible[activeIndex]); }
        } else if (e.key === 'Escape') close();
      });
      options.forEach(function (o) { o.addEventListener('click', function () { choose(o); }); });
      document.addEventListener('click', function (e) {
        if (!wrap.contains(e.target) && !list.contains(e.target)) close();
      });
    });
  }

  /* ---------- Infobulle : support tactile ---------- */
  function initTooltips(root) {
    if (!bind(root === document ? document.documentElement : root, 'tooltip')) return;
    const isTouch = matchMedia('(hover: none)').matches;
    if (!isTouch) return;
    each(root.querySelectorAll('[data-tooltip]'), function (el) {
      el.addEventListener('click', function (e) {
        const wasOpen = el.classList.contains('is-visible');
        each(document.querySelectorAll('[data-tooltip].is-visible'), function (o) { o.classList.remove('is-visible'); });
        if (!wasOpen) { el.classList.add('is-visible'); e.stopPropagation(); }
      });
    });
    document.addEventListener('click', function () {
      each(document.querySelectorAll('[data-tooltip].is-visible'), function (o) { o.classList.remove('is-visible'); });
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
      if (!bind(wrap, 'password')) return;
      const input = wrap.querySelector('input');
      const toggle = wrap.querySelector('[data-j6n-password-toggle]');
      const meter = wrap.parentElement.querySelector('.j6n-password__meter');
      const meterLabel = wrap.parentElement.querySelector('.j6n-password__meter-label');
      const labels = ['Très faible', 'Faible', 'Correct', 'Bon', 'Excellent'];
      const classes = ['is-weak', 'is-weak', 'is-fair', 'is-good', 'is-strong'];

      if (toggle) {
        toggle.addEventListener('click', function () {
          const showing = input.type === 'text';
          input.type = showing ? 'password' : 'text';
          toggle.textContent = showing ? 'Afficher' : 'Masquer';
          toggle.setAttribute('aria-pressed', String(!showing));
        });
      }
      if (meter) {
        input.addEventListener('input', function () {
          const score = input.value ? passwordScore(input.value) : 0;
          meter.className = 'j6n-password__meter ' + (input.value ? classes[score] : '');
          if (meterLabel) meterLabel.textContent = input.value ? labels[score] : '';
        });
      }
    });
  }

  /* ---------- Curseur ---------- */
  function initRange(root) {
    each(root.querySelectorAll('[data-j6n-js="range"]'), function (input) {
      if (!bind(input, 'range')) return;
      const field = input.closest('.j6n-range-field');
      const output = field ? field.querySelector('.j6n-range-field__value') : null;
      function update() {
        const pct = ((input.value - input.min) / (input.max - input.min)) * 100;
        input.style.setProperty('--_fill', pct + '%');
        if (output) output.textContent = input.value + (input.dataset.unit || '');
      }
      input.addEventListener('input', update);
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
      if (!bind(zone, 'upload')) return;
      const input = zone.querySelector('input[type="file"]');
      const list = zone.parentElement.querySelector('.j6n-upload__list') || zone.querySelector('.j6n-upload__list');

      function render(files) {
        if (!list) return;
        list.innerHTML = '';
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
            render(input.files);
          });
          row.appendChild(name); row.appendChild(size); row.appendChild(remove);
          list.appendChild(row);
        });
      }

      input.addEventListener('change', function () { render(input.files); });
      ['dragenter', 'dragover'].forEach(function (evt) {
        zone.addEventListener(evt, function (e) { e.preventDefault(); zone.classList.add('is-dragover'); });
      });
      ['dragleave', 'drop'].forEach(function (evt) {
        zone.addEventListener(evt, function (e) { e.preventDefault(); zone.classList.remove('is-dragover'); });
      });
      zone.addEventListener('drop', function (e) {
        if (e.dataTransfer && e.dataTransfer.files.length) {
          input.files = e.dataTransfer.files;
          render(input.files);
        }
      });
    });
  }

  /* ---------- Bandeaux : notice / consentement (mémorisés) ---------- */
  function initDismiss(root) {
    each(root.querySelectorAll('[data-j6n-dismiss], [data-j6n-dismiss-target]'), function (btn) {
      if (!bind(btn, 'dismiss')) return;
      const key = btn.getAttribute('data-j6n-dismiss');
      const targetId = btn.getAttribute('data-j6n-dismiss-target');
      const target = targetId ? document.getElementById(targetId) : btn.closest('.j6n-notice, .j6n-consent, .j6n-alert');
      if (!target) return;
      if (key && localStorage.getItem(key)) { target.hidden = true; return; }
      btn.addEventListener('click', function () {
        target.hidden = true;
        if (key) localStorage.setItem(key, '1');
      });
    });
  }

  /* ---------- Sommaire : suivi de défilement ---------- */
  function initToc(root) {
    each(root.querySelectorAll('[data-j6n-js="toc"]'), function (toc) {
      if (!bind(toc, 'toc')) return;
      const links = Array.prototype.slice.call(toc.querySelectorAll('a[href^="#"]'));
      const targets = links
        .map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
        .filter(Boolean);
      if (!targets.length || !('IntersectionObserver' in window)) return;
      const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          links.forEach(function (a) { a.classList.remove('is-current'); });
          const link = links[targets.indexOf(entry.target)];
          if (link) link.classList.add('is-current');
        });
      }, { rootMargin: '-20% 0px -70% 0px' });
      targets.forEach(function (t) { observer.observe(t); });
    });
  }

  /* ---------- Tableau triable ---------- */
  function initTableSort(root) {
    each(root.querySelectorAll('[data-j6n-js="table-sort"]'), function (table) {
      if (!bind(table, 'table-sort')) return;
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
        });
      });
    });
  }

  /* ---------- Menu mobile du header ---------- */
  function initMenuToggle(root) {
    each(root.querySelectorAll('[data-j6n-js="menu-toggle"]'), function (btn) {
      if (!bind(btn, 'menu-toggle')) return;
      const nav = btn.closest('.j6n-header').querySelector('.j6n-nav');
      if (!nav) return;
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
      });
      nav.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape' || !nav.classList.contains('is-open')) return;
        set(false);
        btn.focus();
      });
      document.addEventListener('click', function (e) {
        if (nav.classList.contains('is-open') && !nav.contains(e.target)) set(false);
      });
    });
  }

  /* ---------- Bascule d'unités ---------- */
  function initUnitSwitch(root) {
    each(root.querySelectorAll('[data-j6n-js="unit-switch"]'), function (group) {
      if (!bind(group, 'unit-switch')) return;
      each(group.querySelectorAll('input[type="radio"]'), function (input) {
        input.addEventListener('change', function () {
          if (!input.checked) return;
          document.dispatchEvent(new CustomEvent('j6n:unit-change', { detail: { unit: input.value } }));
        });
      });
    });
  }

  /* ---------- Annonces discrètes pour lecteur d'écran (RGAA 7.4 / WCAG 4.1.3) ---------- */
  let announceRegion;
  function announce(message) {
    if (!announceRegion) {
      announceRegion = document.createElement('div');
      announceRegion.className = 'j6n-sr-only';
      announceRegion.setAttribute('aria-live', 'polite');
      announceRegion.setAttribute('role', 'status');
      document.body.appendChild(announceRegion);
    }
    announceRegion.textContent = '';
    // reflow avant de reposer le texte : force l'annonce même si le message ne change pas
    void announceRegion.offsetWidth;
    announceRegion.textContent = message;
  }

  /* ---------- Toasts ---------- */
  function toastRegion() {
    let region = document.getElementById('j6n-toast-region');
    if (!region) {
      region = document.createElement('div');
      region.id = 'j6n-toast-region';
      region.setAttribute('aria-live', 'polite');
      region.setAttribute('role', 'status');
      document.body.appendChild(region);
    }
    return region;
  }
  function toast(message, opts) {
    opts = opts || {};
    const region = toastRegion();
    const el = document.createElement('div');
    el.className = 'j6n-toast' + (opts.tone ? ' j6n-toast--' + opts.tone : '');
    const text = document.createElement('span');
    text.textContent = message;
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'j6n-toast__close';
    close.setAttribute('aria-label', 'Fermer');
    close.textContent = '×';
    el.appendChild(text);
    el.appendChild(close);
    region.appendChild(el);

    function dismiss() {
      el.classList.add('is-leaving');
      el.addEventListener('animationend', function () { el.remove(); }, { once: true });
    }
    close.addEventListener('click', dismiss);
    if (opts.duration !== 0) setTimeout(dismiss, opts.duration || 4000);
    return el;
  }

  /* ---------- Champs : association automatique des messages (RGAA 11.9 / WCAG 3.3.1) ---------- */
  function initFieldDescriptions(root) {
    each(root.querySelectorAll('.j6n-field, .j6n-range-field'), function (field) {
      if (!bind(field, 'field-describe')) return;
      const control = field.querySelector('input, select, textarea');
      if (!control) return;
      const describers = field.querySelectorAll('.j6n-hint, .j6n-field__count, .j6n-password__meter-label');
      const ids = [];
      describers.forEach(function (el, i) {
        // liés même si vides pour l'instant (ex. le score du mot de passe se remplit
        // au fil de la saisie) : la relation doit exister dès le départ.
        if (!el.id) el.id = (control.id || 'j6n-field') + '-desc-' + i;
        ids.push(el.id);
      });
      if (!ids.length) return;
      const existing = (control.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      ids.forEach(function (id) { if (existing.indexOf(id) === -1) existing.push(id); });
      control.setAttribute('aria-describedby', existing.join(' '));
    });
  }

  /* ---------- Amorçage ---------- */
  function init(root) {
    root = root || document;
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
    initTableSort(root);
    initMenuToggle(root);
    initUnitSwitch(root);
  }

  document.documentElement.setAttribute('data-j6n', 'true');
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(document); });
  } else {
    init(document);
  }

  window.j6n = { init: init, toast: toast, openModal: openModal, closeModal: closeModal };
})();
