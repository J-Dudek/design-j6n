/* ============================================================
   FOULÉE — vitrine de démo (demo/ uniquement)
   Transforme chaque <div class="j6n-showcase" data-j6n-js="showcase">
   contenant un <template> en bloc Résultat / Code + simulateur de
   largeur, à la manière de systeme-de-design.gouv.fr.

   Doit être chargé AVANT theme.js et avant les scripts propres à
   chaque page : il clone le contenu du <template> dans le DOM de
   façon synchrone, avant que theme.js (au DOMContentLoaded) ou les
   scripts de démo (plus bas dans la page) n'aient besoin des
   éléments qu'il contient.
   ============================================================ */
(function () {
  'use strict';

  function dedent(str) {
    const lines = str.replace(/^\r?\n/, '').replace(/\s+$/, '').split('\n');
    let indent = Infinity;
    lines.forEach(function (line) {
      if (!line.trim()) return;
      const m = line.match(/^[ \t]*/)[0].length;
      if (m < indent) indent = m;
    });
    if (!isFinite(indent)) indent = 0;
    return lines.map(function (l) { return l.slice(indent); }).join('\n');
  }

  const WIDTHS = [
    { label: 'Mobile', value: '375px' },
    { label: 'Tablette', value: '768px' },
    { label: 'Large', value: 'none', active: true }
  ];

  function buildShowcase(block) {
    const template = block.querySelector('template');
    if (!template) return;
    const source = dedent(template.innerHTML);

    const preview = document.createElement('div');
    preview.className = 'j6n-showcase__preview';
    const inner = document.createElement('div');
    inner.className = 'j6n-showcase__preview-inner';
    inner.style.maxWidth = 'none';
    inner.appendChild(template.content.cloneNode(true));
    preview.appendChild(inner);

    const codePre = document.createElement('pre');
    codePre.className = 'j6n-showcase__code j6n-pre';
    const codeEl = document.createElement('code');
    codeEl.textContent = source;
    codePre.appendChild(codeEl);

    const toolbar = document.createElement('div');
    toolbar.className = 'j6n-showcase__toolbar';

    // Un groupe de deux boutons à bascule (pas un vrai tablist ARIA : pas de
    // navigation par flèches implémentée, donc pas de role="tab" — un rôle à
    // moitié posé serait pire qu'un simple groupe de boutons pressés/relâchés).
    const tabsWrap = document.createElement('div');
    tabsWrap.className = 'j6n-showcase__tabs';
    tabsWrap.setAttribute('role', 'group');
    tabsWrap.setAttribute('aria-label', 'Affichage de l’exemple');
    ['Résultat', 'Code'].forEach(function (label, i) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      btn.dataset.tab = i === 0 ? 'result' : 'code';
      btn.setAttribute('aria-pressed', String(i === 0));
      if (i === 0) btn.classList.add('is-active');
      tabsWrap.appendChild(btn);
    });

    const widthWrap = document.createElement('div');
    widthWrap.className = 'j6n-showcase__viewport';
    widthWrap.setAttribute('role', 'group');
    widthWrap.setAttribute('aria-label', 'Largeur de prévisualisation');
    WIDTHS.forEach(function (w) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = w.label;
      btn.dataset.width = w.value;
      btn.setAttribute('aria-pressed', String(!!w.active));
      if (w.active) btn.classList.add('is-active');
      widthWrap.appendChild(btn);
    });

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'j6n-showcase__copy';
    copyBtn.textContent = 'Copier';

    toolbar.appendChild(tabsWrap);
    toolbar.appendChild(widthWrap);
    toolbar.appendChild(copyBtn);

    block.textContent = '';
    block.appendChild(preview);
    block.appendChild(codePre);
    block.appendChild(toolbar);

    const tabs = tabsWrap.querySelectorAll('button');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.remove('is-active'); t.setAttribute('aria-pressed', 'false'); });
        tab.classList.add('is-active');
        tab.setAttribute('aria-pressed', 'true');
        block.classList.toggle('is-code', tab.dataset.tab === 'code');
      });
    });

    const widthBtns = widthWrap.querySelectorAll('button');
    widthBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        widthBtns.forEach(function (b) { b.classList.remove('is-active'); b.setAttribute('aria-pressed', 'false'); });
        btn.classList.add('is-active');
        btn.setAttribute('aria-pressed', 'true');
        inner.style.maxWidth = btn.dataset.width;
      });
    });

    copyBtn.addEventListener('click', function () {
      if (!navigator.clipboard || !navigator.clipboard.writeText) return;
      navigator.clipboard.writeText(source).then(function () {
        copyBtn.textContent = 'Copié';
        setTimeout(function () { copyBtn.textContent = 'Copier'; }, 1400);
      }, function () {
        copyBtn.textContent = 'Erreur';
        setTimeout(function () { copyBtn.textContent = 'Copier'; }, 1400);
      });
    });
  }

  document.querySelectorAll('.j6n-showcase[data-j6n-js="showcase"]').forEach(buildShowcase);

  /* Numéro de version dans le header, lu dans package.json (servi avec la démo,
     voir netlify.toml). Ouverte en file://, la lecture échoue : le badge reste caché. */
  const versionBadge = document.querySelector('[data-demo-version]');
  if (versionBadge) {
    fetch('../package.json')
      .then(function (res) { return res.ok ? res.json() : Promise.reject(res.status); })
      .then(function (pkg) {
        versionBadge.textContent = 'v' + pkg.version;
        versionBadge.hidden = false;
      })
      .catch(function () {});
  }

  /* ---------- Recherche de composant (bouton du header) ----------
     L'index est construit en lisant les titres de section (h2[id]) des pages
     listées dans la navigation du header : rien à maintenir à la main.
     Ouverte en file://, la lecture des pages échoue : le bouton reste caché. */
  const searchBtn = document.querySelector('[data-demo-search]');
  if (searchBtn) initSearch(searchBtn);

  function normalize(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  function initSearch(btn) {
    const pages = Array.prototype.map.call(
      document.querySelectorAll('.j6n-header .j6n-nav a[href]'),
      function (a) { return a.getAttribute('href'); }
    );

    Promise.all(pages.map(function (href) {
      return fetch(href)
        .then(function (res) { return res.ok ? res.text() : Promise.reject(res.status); })
        .then(function (text) {
          const doc = new DOMParser().parseFromString(text, 'text/html');
          const h1 = doc.querySelector('main h1');
          const pageTitle = h1 ? h1.textContent.trim() : href;
          return Array.prototype.map.call(doc.querySelectorAll('main h2[id]'), function (h2) {
            const code = h2.querySelector('code');
            const title = h2.textContent.split(' — ')[0].trim();
            const cls = code ? code.textContent.trim() : '';
            return {
              title: title, cls: cls, page: pageTitle, href: href + '#' + h2.id,
              haystack: normalize(title + ' ' + cls + ' ' + pageTitle)
            };
          });
        });
    })).then(function (lists) {
      const entries = [].concat.apply([], lists);
      if (!entries.length) return;
      buildSearch(btn, entries);
      btn.hidden = false;
    }).catch(function () {});
  }

  function buildSearch(btn, entries) {
    const dialog = document.createElement('dialog');
    dialog.className = 'j6n-modal j6n-demo-search';
    dialog.setAttribute('aria-label', 'Rechercher un composant');
    // Contenu dans une boîte interne : un clic directement sur <dialog> est alors
    // forcément un clic sur le fond, qui ferme la recherche.
    dialog.innerHTML =
      '<div class="j6n-demo-search__box">' +
      '<label class="j6n-sr-only" for="demo-search-input">Rechercher un composant</label>' +
      '<input class="j6n-input" id="demo-search-input" type="text" autocomplete="off" spellcheck="false"' +
      ' role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls="demo-search-results"' +
      ' placeholder="Rechercher un composant, une classe…">' +
      '<div class="j6n-demo-search__results" id="demo-search-results" role="listbox" aria-label="Résultats"></div>' +
      '<p class="j6n-demo-search__status" aria-live="polite"></p>' +
      '</div>';
    document.body.appendChild(dialog);

    const input = dialog.querySelector('input');
    const results = dialog.querySelector('[role="listbox"]');
    const status = dialog.querySelector('.j6n-demo-search__status');
    let matches = [];
    let active = 0;

    function render() {
      const terms = normalize(input.value.trim()).split(/\s+/).filter(Boolean);
      matches = entries.filter(function (e) {
        return terms.every(function (t) { return e.haystack.indexOf(t) > -1; });
      });
      // Titre qui commence par la recherche en premier, puis l'ordre des pages.
      if (terms.length) {
        matches.sort(function (a, b) {
          const sa = normalize(a.title).indexOf(terms[0]) === 0 ? 0 : 1;
          const sb = normalize(b.title).indexOf(terms[0]) === 0 ? 0 : 1;
          return sa - sb;
        });
      }
      active = 0;
      results.innerHTML = '';
      matches.forEach(function (e, i) {
        const opt = document.createElement('div');
        opt.className = 'j6n-combobox__option j6n-demo-search__option';
        opt.id = 'demo-search-opt-' + i;
        opt.setAttribute('role', 'option');
        const title = document.createElement('span');
        title.className = 'j6n-demo-search__title';
        title.textContent = e.title;
        opt.appendChild(title);
        if (e.cls) {
          const code = document.createElement('code');
          code.textContent = e.cls;
          opt.appendChild(code);
        }
        const page = document.createElement('span');
        page.className = 'j6n-demo-search__page';
        page.textContent = e.page;
        opt.appendChild(page);
        opt.addEventListener('click', function () { go(e); });
        opt.addEventListener('mousemove', function () { if (active !== i) setActive(i); });
        results.appendChild(opt);
      });
      status.textContent = matches.length
        ? matches.length + (matches.length > 1 ? ' résultats' : ' résultat')
        : 'Aucun composant ne correspond.';
      setActive(0);
    }

    function setActive(i) {
      const opts = results.children;
      if (!opts.length) { input.removeAttribute('aria-activedescendant'); return; }
      active = (i + opts.length) % opts.length;
      Array.prototype.forEach.call(opts, function (o, j) {
        o.classList.toggle('is-active', j === active);
        o.setAttribute('aria-selected', String(j === active));
      });
      input.setAttribute('aria-activedescendant', opts[active].id);
      opts[active].scrollIntoView({ block: 'nearest' });
    }

    function go(entry) {
      const url = new URL(entry.href, location.href);
      dialog.close();
      if (url.pathname === location.pathname) {
        const target = document.getElementById(url.hash.slice(1));
        if (!target) return;
        history.pushState(null, '', url.hash);
        target.setAttribute('tabindex', '-1');
        target.scrollIntoView();
        target.focus({ preventScroll: true });
      } else {
        location.href = url.href;
      }
    }

    function open() {
      input.value = '';
      render();
      dialog.showModal();
      input.focus();
    }

    input.addEventListener('input', render);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
      else if (e.key === 'Enter' && matches[active]) { e.preventDefault(); go(matches[active]); }
    });
    dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });

    btn.addEventListener('click', open);
    document.addEventListener('keydown', function (e) {
      if (dialog.open) return;
      const typing = e.target.closest && e.target.closest('input, textarea, select, [contenteditable]');
      const shortcut = (e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing);
      if (!shortcut) return;
      e.preventDefault();
      open();
    });
  }
})();
