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
    var lines = str.replace(/^\r?\n/, '').replace(/\s+$/, '').split('\n');
    var indent = Infinity;
    lines.forEach(function (line) {
      if (!line.trim()) return;
      var m = line.match(/^[ \t]*/)[0].length;
      if (m < indent) indent = m;
    });
    if (!isFinite(indent)) indent = 0;
    return lines.map(function (l) { return l.slice(indent); }).join('\n');
  }

  var WIDTHS = [
    { label: 'Mobile', value: '375px' },
    { label: 'Tablette', value: '768px' },
    { label: 'Large', value: 'none', active: true }
  ];

  function buildShowcase(block) {
    var template = block.querySelector('template');
    if (!template) return;
    var source = dedent(template.innerHTML);

    var preview = document.createElement('div');
    preview.className = 'j6n-showcase__preview';
    var inner = document.createElement('div');
    inner.className = 'j6n-showcase__preview-inner';
    inner.style.maxWidth = 'none';
    inner.appendChild(template.content.cloneNode(true));
    preview.appendChild(inner);

    var codePre = document.createElement('pre');
    codePre.className = 'j6n-showcase__code j6n-pre';
    var codeEl = document.createElement('code');
    codeEl.textContent = source;
    codePre.appendChild(codeEl);

    var toolbar = document.createElement('div');
    toolbar.className = 'j6n-showcase__toolbar';

    // Un groupe de deux boutons à bascule (pas un vrai tablist ARIA : pas de
    // navigation par flèches implémentée, donc pas de role="tab" — un rôle à
    // moitié posé serait pire qu'un simple groupe de boutons pressés/relâchés).
    var tabsWrap = document.createElement('div');
    tabsWrap.className = 'j6n-showcase__tabs';
    tabsWrap.setAttribute('role', 'group');
    tabsWrap.setAttribute('aria-label', 'Affichage de l’exemple');
    ['Résultat', 'Code'].forEach(function (label, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      btn.dataset.tab = i === 0 ? 'result' : 'code';
      btn.setAttribute('aria-pressed', String(i === 0));
      if (i === 0) btn.classList.add('is-active');
      tabsWrap.appendChild(btn);
    });

    var widthWrap = document.createElement('div');
    widthWrap.className = 'j6n-showcase__viewport';
    widthWrap.setAttribute('role', 'group');
    widthWrap.setAttribute('aria-label', 'Largeur de prévisualisation');
    WIDTHS.forEach(function (w) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = w.label;
      btn.dataset.width = w.value;
      btn.setAttribute('aria-pressed', String(!!w.active));
      if (w.active) btn.classList.add('is-active');
      widthWrap.appendChild(btn);
    });

    var copyBtn = document.createElement('button');
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

    var tabs = tabsWrap.querySelectorAll('button');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.remove('is-active'); t.setAttribute('aria-pressed', 'false'); });
        tab.classList.add('is-active');
        tab.setAttribute('aria-pressed', 'true');
        block.classList.toggle('is-code', tab.dataset.tab === 'code');
      });
    });

    var widthBtns = widthWrap.querySelectorAll('button');
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
})();
