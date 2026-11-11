/* Nivesh Sahayak look-up sites: theme button, copy/share helpers, one sponsor card. No tracking, no cookies. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var NSL = window.NSL = {};
  NSL.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  NSL.toast = function (msg) {
    var t = d.querySelector('.toast') || d.body.appendChild(d.createElement('div'));
    t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg; t.hidden = false;
    clearTimeout(NSL._tt); NSL._tt = setTimeout(function () { t.hidden = true; }, 2200);
  };
  NSL.copy = function (text, done) {
    var ok = function () { NSL.toast(done || 'Copied'); };
    var old = function () {
      var a = d.createElement('textarea'); a.value = text; a.setAttribute('readonly', ''); a.style.position = 'fixed'; a.style.opacity = '0';
      d.body.appendChild(a); a.select();
      try { d.execCommand('copy'); ok(); } catch (e) { NSL.toast('Press and hold to copy: ' + text); }
      a.remove();
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, old); else old();
  };
  NSL.share = function (title, text, url) {
    if (navigator.share) navigator.share({ title: title, text: text, url: url }).catch(function () {});
    else NSL.copy(text + ' ' + url, 'Copied, ready to paste');
  };
  NSL.json = function (url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); };
  NSL.slug = function (s) { return String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x'; };
  /* recent look-ups of this site, kept only in this browser */
  NSL.recent = function (key, item) {
    var list = [];
    try { list = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) {}
    if (item) {
      list = [item].concat(list.filter(function (x) { return x.u !== item.u; })).slice(0, 6);
      try { localStorage.setItem(key, JSON.stringify(list)); } catch (e) {}
    }
    return list;
  };

  d.addEventListener('click', function (e) {
    var b = e.target.closest('[data-theme-btn],[data-copy],[data-share]');
    if (!b) return;
    if (b.hasAttribute('data-theme-btn')) {
      var dark = root.getAttribute('data-theme') ? root.getAttribute('data-theme') === 'dark' : matchMedia('(prefers-color-scheme:dark)').matches;
      root.setAttribute('data-theme', dark ? 'light' : 'dark');
      try { localStorage.setItem('ns-theme', dark ? 'light' : 'dark'); } catch (e2) {}
    } else if (b.hasAttribute('data-copy')) NSL.copy(b.getAttribute('data-copy'), b.getAttribute('data-done') || 'Copied');
    else NSL.share(d.title, b.getAttribute('data-share'), b.getAttribute('data-url') || location.href);
  });

  /* one sponsor card, from the shared list. Never the owner's own cards, never rivals of Nivesh Sahayak tools, India-only offers only in India. */
  function sponsor() {
    var slot = d.querySelector('[data-sponsor]');
    if (!slot || d.body.getAttribute('data-ads') === '0' || root.classList.contains('embed')) return;
    var india = /Calcutta|Kolkata/.test((Intl.DateTimeFormat().resolvedOptions() || {}).timeZone || '');
    var rival = /billing|invoice|accounting|gst software|vyapar|tally|zoho|khatabook|mybillbook/i;
    var promo = '<p class="sp-promo"><a href="https://promo.niveshsahayak.in/" target="_blank" rel="noopener">Want your business on this card? Promote it here →</a></p>';
    fetch('https://share.groupchaton.com/promos.json', { mode: 'cors' }).then(function (r) { return r.json(); }).then(function (j) {
      var list = (j.promos || []).filter(function (p) {
        if (!p || !p.href || ((p.own || p.family) && p.family !== 'designs')) return false;
        if (p.india && !india) return false;
        return !rival.test([p.title, p.line, p.href].join(' '));
      });
      if (!list.length) { slot.innerHTML = promo; slot.hidden = false; return; }
      var p = list[Math.floor(Math.random() * list.length)];
      var img = p.imgs && p.imgs.length ? p.imgs[Math.floor(Math.random() * p.imgs.length)] : (p.img_icon || '');
      slot.innerHTML = '<a class="sponsor" href="' + NSL.esc(p.href) + '" target="_blank" rel="' + (p.family ? 'noopener' : 'sponsored noopener') + '">' +
        (img ? '<img src="' + NSL.esc(img) + '" alt="" loading="lazy" width="72" height="72">' : '') +
        '<span><small>' + NSL.esc(p.tag || 'Sponsored') + '</small><b>' + NSL.esc(p.title || '') + '</b>' + (p.line ? '<span>' + NSL.esc(p.line) + '</span>' : '') +
        (p.cta ? '<em>' + NSL.esc(p.cta) + ' →</em>' : '') + '</span></a>' + promo;
      slot.hidden = false;
    }).catch(function () {});
  }

  root.classList.add('ready');

  /* inside the App's frame: a link to another website opens in a new tab (most sites refuse to show inside a frame) */
  if (root.classList.contains('embed')) d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (a && a.host !== location.host && !a.target) { a.target = '_blank'; a.rel = (a.rel ? a.rel + ' ' : '') + 'noopener'; }
  }, true);

  /* fetch the next page when a finger or the mouse rests on its link, so it opens without a wait (never on Save-Data or 2G) */
  var conn = navigator.connection || {}, seen = {};
  function warm(e) {
    var a = e.target.closest && e.target.closest('a[href^="/"]');
    if (!a || conn.saveData || /2g/.test(conn.effectiveType || '') || seen[a.pathname] || a.pathname === location.pathname) return;
    seen[a.pathname] = 1;
    var l = d.createElement('link'); l.rel = 'prefetch'; l.href = a.href; d.head.appendChild(l);
  }
  d.addEventListener('pointerenter', warm, true);
  d.addEventListener('touchstart', warm, { passive: true, capture: true });

  if ('serviceWorker' in navigator && location.protocol === 'https:') window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () {}); });
  if ('requestIdleCallback' in window) requestIdleCallback(sponsor, { timeout: 2500 }); else setTimeout(sponsor, 900);
})();
