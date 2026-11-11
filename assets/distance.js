/* distance.niveshsahayak.in: calculator (place suggestions, straight line, road, flying time), fuel cost, list filter. Runs in the browser. */
(function () {
  'use strict';
  var d = document, N = window.NSL, esc = N.esc, $ = function (s, r) { return (r || d).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || d).querySelectorAll(s)); };
  var COMPASS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
  var places = null, roads = null;
  function load() {
    if (!places) places = Promise.all([N.json('/data/places.json'), N.json('/data/road.json')]).then(function (a) { roads = a[1]; return a[0]; });
    return places;
  }
  var num = function (n) { return Math.round(n).toLocaleString('en-IN'); };
  function hm(min) { min = Math.round(min); var h = Math.floor(min / 60), m = min % 60; return h ? h + ' h ' + (m < 10 ? '0' : '') + m + ' min' : m + ' min'; }
  function hours(min) {
    var lo = min / 60, hi = min * 1.35 / 60;
    if (hi < 1.5) return Math.round(min / 5) * 5 + ' to ' + Math.round(min * 1.35 / 5) * 5 + ' minutes';
    var f = function (x) { return x < 10 ? String(Math.round(x * 2) / 2) : String(Math.round(x)); };
    return f(lo) + ' to ' + f(hi) + ' hours';
  }
  function rad(x) { return x * Math.PI / 180; }
  function hav(a, b) {
    var p1 = rad(a[2]), p2 = rad(b[2]), dl = rad(b[3] - a[3]);
    var h = Math.pow(Math.sin((p2 - p1) / 2), 2) + Math.cos(p1) * Math.cos(p2) * Math.pow(Math.sin(dl / 2), 2);
    return 6371.0088 * 2 * Math.asin(Math.sqrt(h));
  }
  function bearing(a, b) {
    var p1 = rad(a[2]), p2 = rad(b[2]), dl = rad(b[3] - a[3]);
    return (Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)) * 180 / Math.PI + 360) % 360;
  }
  var label = function (p) { return p[0] + (p[1] && p[1] !== p[0] ? ', ' + p[1] : ''); };
  var plain = function (s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); };

  /* suggestions under a place box */
  $$('[data-place]').forEach(function (inp) {
    var ul = inp.parentNode.querySelector('.sug'), keys = null, cur = -1;
    function close() { ul.hidden = true; cur = -1; }
    function pick(p) { inp.value = label(p); inp._place = p; close(); }
    function show() {
      var q = plain(inp.value);
      inp._place = null;
      if (q.length < 2) { close(); return; }
      load().then(function (list) {
        if (!keys) keys = list.map(function (p) { return plain(p[0]); });
        var a = [], b = [];
        for (var i = 0; i < list.length && a.length < 8; i++) { if (keys[i].indexOf(q) === 0) a.push(list[i]); else if (b.length < 8 && keys[i].indexOf(q) > 0) b.push(list[i]); }
        var hits = a.concat(b).slice(0, 8);
        ul.innerHTML = hits.length ? hits.map(function (p, i) { return '<li><button type="button" data-i="' + i + '">' + esc(p[0]) + (p[1] ? ' <small>' + esc(p[1]) + '</small>' : '') + '</button></li>'; }).join('')
          : '<li class="none">No place with that name in our list. Try the nearest larger town.</li>';
        ul._hits = hits; ul.hidden = false; cur = -1;
      }).catch(function () { ul.innerHTML = '<li class="none">The list of places did not load. Check your connection.</li>'; ul.hidden = false; });
    }
    inp.addEventListener('input', show);
    inp.addEventListener('focus', function () { load().catch(function () {}); });
    inp.addEventListener('keydown', function (e) {
      var btns = $$('button', ul);
      if (ul.hidden || !btns.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); cur = (cur + (e.key === 'ArrowDown' ? 1 : btns.length - 1)) % btns.length; btns.forEach(function (b, i) { b.classList.toggle('on', i === cur); }); }
      else if (e.key === 'Enter' && cur > -1) { e.preventDefault(); pick(ul._hits[cur]); }
      else if (e.key === 'Escape') close();
    });
    ul.addEventListener('mousedown', function (e) { e.preventDefault(); });
    ul.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) pick(ul._hits[+b.getAttribute('data-i')]); });
    inp.addEventListener('blur', function () { setTimeout(close, 150); });
  });

  function find(list, text) {
    var q = plain(text.split(',')[0]), reg = plain(text.split(',').slice(1).join(' '));
    if (!q) return null;
    var best = null;
    for (var i = 0; i < list.length; i++) {
      if (plain(list[i][0]) === q) { if (!reg || plain(list[i][1]) === reg) return list[i]; best = best || list[i]; }
    }
    if (best) return best;
    for (i = 0; i < list.length; i++) if (plain(list[i][0]).indexOf(q) === 0) return list[i];
    return null;
  }

  var form = $('[data-dist-form]'), out = $('[data-dist-out]');
  function say(html) { out.innerHTML = '<div class="result rise">' + html + '</div>'; }
  function calc(quiet) {
    var fi = form.from, ti = form.to;
    if (!fi.value.trim() || !ti.value.trim()) { if (!quiet) say('<h2>Choose both places</h2><p>Type a place in From and in To, and pick each from the list.</p>'); return; }
    out.innerHTML = '<div class="shim" style="height:170px;margin-top:14px"></div>';
    load().then(function (list) {
      var a = fi._place || find(list, fi.value), b = ti._place || find(list, ti.value);
      if (!a || !b) { say('<h2>We do not know ' + esc(!a ? fi.value : ti.value) + '</h2><p>Pick the place from the list that opens as you type. If your town is not there, choose the nearest larger town.</p>'); return; }
      fi.value = label(a); ti.value = label(b);
      if (a === b) { say('<h2>That is the same place</h2><p>Choose two different places.</p>'); return; }
      var air = hav(a, b), comp = COMPASS[Math.floor((bearing(a, b) + 22.5) / 45) % 8], fly = 30 + air / 800 * 60;
      var km = null, min = null, page = '';
      if (a[4] != null && b[4] != null) {
        km = roads.km[a[4]][b[4]]; min = roads.min[a[4]][b[4]];
        var lo = Math.min(a[4], b[4]), hi = Math.max(a[4], b[4]);
        if (lo < roads.major || (km != null && km <= roads.near)) page = '/' + roads.slugs[lo] + '-to-' + roads.slugs[hi] + '/';
      }
      var head, rows = '', share;
      if (km != null) {
        head = '<h2>' + esc(a[0]) + ' to ' + esc(b[0]) + ' by road</h2><p class="big">' + num(km) + ' km</p>';
        rows = '<dt>Driving time</dt><dd>about ' + hours(min) + '</dd><dt>Straight line</dt><dd>' + num(air) + ' km</dd>';
        share = a[0] + ' to ' + b[0] + ': ' + num(km) + ' km by road, about ' + hours(min) + ' of driving. Straight line ' + num(air) + ' km.';
      } else {
        head = '<h2>' + esc(a[0]) + ' to ' + esc(b[0]) + '</h2><p class="big">' + num(air) + ' km in a straight line</p>';
        if (a[4] != null && b[4] != null) rows = '<dt>By road</dt><dd>No road joins them</dd>';
        else if (air < 3000) rows = '<dt>By road</dt><dd>likely ' + num(air * 1.15) + ' to ' + num(air * 1.4) + ' km (an estimate from the straight line; more in the hills)</dd>';
        share = a[0] + ' to ' + b[0] + ': ' + num(air) + ' km in a straight line' + (air >= 150 ? ', about ' + hm(fly) + ' flying time.' : '.');
      }
      say(head + '<dl class="facts">' + rows + (air >= 150 ? '<dt>By air</dt><dd>about ' + hm(fly) + ' flying time</dd>' : '') + '<dt>In miles</dt><dd>' + num((km != null ? km : air) * 0.621371) + ' miles' + (km != null ? ' by road' : ' in a straight line') + '</dd>' +
        '<dt>Direction</dt><dd>' + esc(b[0]) + ' is to the ' + comp + ' of ' + esc(a[0]) + '</dd></dl>' +
        '<div class="acts"><button class="btn" type="button" data-share="' + esc(share) + '">Share</button>' + (page ? '<a class="btn ghost" href="' + page + '">Time and fuel tables</a>' : '') + '</div>' +
        '<p class="hint">' + (km != null ? 'Road figures come from OpenStreetMap data and can differ from the road you take.' : 'Exact road distances are given between the cities on the Cities page.') + '</p>');
      try { history.replaceState(null, '', location.pathname + '?from=' + encodeURIComponent(N.slug(a[0])) + '&to=' + encodeURIComponent(N.slug(b[0])) + '#calc'); } catch (e) {}
    }).catch(function () { say('<h2>The data did not load</h2><p>Check your internet connection and try again.</p>'); });
  }
  if (form) {
    form.addEventListener('submit', function (e) { e.preventDefault(); calc(); });
    $('[data-swap]').addEventListener('click', function () {
      var f = form.from, t = form.to, v = f.value, p = f._place;
      f.value = t.value; f._place = t._place; t.value = v; t._place = p;
      if (f.value && t.value) calc(true);
    });
    var q = new URLSearchParams(location.search);
    if (q.get('from') || q.get('to')) {
      load().then(function (list) {
        var by = function (s) { s = plain(s || ''); for (var i = 0; i < list.length; i++) if (plain(list[i][0]) === s) return list[i]; return null; };
        var a = by(q.get('from')), b = by(q.get('to'));
        if (a) { form.from.value = label(a); form.from._place = a; }
        if (b) { form.to.value = label(b); form.to._place = b; }
        if (a && b) calc(true);
      }).catch(function () {});
    }
  }

  /* fuel cost on a route page */
  var fuel = $('[data-fuel]');
  if (fuel) {
    var km0 = +fuel.getAttribute('data-fuel'), fm = $('#fm'), fp = $('#fp'), fo = $('[data-fuel-out]');
    var upd = function () {
      var m = parseFloat(fm.value), p = parseFloat(fp.value);
      if (!(m > 0)) { fo.textContent = 'Type your vehicle\'s mileage in km per litre.'; return; }
      var l = km0 / m;
      fo.textContent = p > 0 ? 'One way: about ' + (l < 10 ? l.toFixed(1) : num(l)) + ' litres, ₹' + num(l * p) + '. Round trip: about ₹' + num(2 * l * p) + '. Tolls are extra.'
        : 'One way needs about ' + (l < 10 ? l.toFixed(1) : num(l)) + ' litres. Type today\'s fuel price to see the cost.';
    };
    fm.addEventListener('input', upd); fp.addEventListener('input', upd);
  }

  /* filter the rows of a city's table */
  var rf = $('[data-row-filter]');
  if (rf) rf.addEventListener('input', function () {
    var w = plain(rf.value);
    $$('table tbody tr').forEach(function (tr) { tr.hidden = w && plain(tr.cells[0].textContent).indexOf(w) < 0; });
  });
})();
