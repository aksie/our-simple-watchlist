/* Watchlist core: reads and writes the one-line-per-title text file. No page code here, so it can be tested on its own. */
(function (root) {
  'use strict';
  var TYPES = ['movie', 'series', 'podcast'];
  var BALLOON = '🎈';

  function tidy(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
  function tidyNote(s) { return tidy(String(s || '').replace(/[()]/g, ', ').replace(/\s#/g, ' ')).replace(/(\s*,)+\s*$/, '').replace(/^,\s*/, ''); }
  function key(title) { return String(title || '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''); }

  function parse(text) {
    var head = [], items = [], started = false;
    String(text || '').split(/\r?\n/).forEach(function (raw) {
      var m = raw.match(/^- \[( |x|X)\]\s*(.*)$/);
      if (!m) { if (!started) head.push(raw); return; }
      started = true;
      var rest = ' ' + m[2];
      var it = { seen: m[1] !== ' ', loved: false, title: '', note: '', type: 'movie', tags: [], added: '', url: '' };
      if (rest.indexOf(BALLOON) !== -1) { it.loved = true; rest = rest.replace(BALLOON, ' '); }
      rest = rest.replace(/\s(https?:\/\/\S+)\s*$/, function (_, u) { it.url = u; return ''; });
      rest = rest.replace(/\s\+(\d{4}-\d{2}-\d{2})(?=\s|$)/, function (_, d) { it.added = d; return ''; });
      rest = rest.replace(/\s#([\p{L}\p{N}_-]+)(?=\s|$)/gu, function (_, t) {
        var l = t.toLowerCase();
        if (TYPES.indexOf(l) !== -1) it.type = l; else if (it.tags.indexOf(l) === -1) it.tags.push(l);
        return '';
      });
      rest = tidy(rest);
      var p = rest.indexOf(' (');
      if (p > 0 && rest.charAt(rest.length - 1) === ')') { it.title = tidy(rest.slice(0, p)); it.note = tidy(rest.slice(p + 2, -1)); }
      else it.title = rest;
      if (it.title) items.push(it);
    });
    return { head: head.join('\n').replace(/\n+$/, ''), items: items };
  }

  function line(it) {
    var s = '- [' + (it.seen ? 'x' : ' ') + '] ' + (it.loved ? BALLOON + ' ' : '') + it.title;
    if (it.note) s += ' (' + it.note + ')';
    s += ' #' + it.type;
    (it.tags || []).forEach(function (t) { s += ' #' + t; });
    if (it.added) s += ' +' + it.added;
    if (it.url) s += ' ' + it.url;
    return s;
  }
  function serialize(head, items) { return (head ? head + '\n\n' : '') + items.map(line).join('\n') + '\n'; }

  function guessType(text) {
    var t = String(text || '').toLowerCase();
    if (/podcast/.test(t)) return 'podcast';
    if (/film|movie|bios/.test(t)) return 'movie';
    if (/serie|seizoen|season|npo|hbo|apple|disney/.test(t)) return 'series';
    return 'movie';
  }

  function fromInput(raw, type, today) {
    var s = ' ' + tidy(raw), tags = [], url = '';
    s = s.replace(/\s(https?:\/\/\S+)/, function (_, u) { url = u; return ''; });
    s = s.replace(/\s#([\p{L}\p{N}_-]+)/gu, function (_, t) { var l = t.toLowerCase(); if (TYPES.indexOf(l) !== -1) type = l; else if (tags.indexOf(l) === -1) tags.push(l); return ''; });
    s = tidy(s);
    var title = s, note = '', p = s.indexOf('(');
    if (p > 0) { title = s.slice(0, p); note = s.slice(p + 1); }
    title = tidy(title).replace(/[\s,;:-]+$/, '');
    if (!title) return null;
    title = title.charAt(0).toUpperCase() + title.slice(1);
    return { seen: false, loved: false, title: title, note: tidyNote(note), type: TYPES.indexOf(type) !== -1 ? type : 'movie', tags: tags, added: today || '', url: url };
  }

  /* One change, described so it can be replayed on a fresher copy of the list. */
  function apply(items, op) {
    var i = -1, n;
    if (op.kind === 'add') {
      for (n = 0; n < items.length; n++) if (key(items[n].title) === key(op.item.title)) return false;
      var copy = Object.assign({}, op.item, { tags: (op.item.tags || []).slice() });
      if (typeof op.at === 'number' && op.at >= 0 && op.at <= items.length) items.splice(op.at, 0, copy); else items.push(copy);
      return true;
    }
    for (n = 0; n < items.length; n++) if (key(items[n].title) === op.key) { i = n; break; }
    if (i === -1) return false;
    if (op.kind === 'remove') { items.splice(i, 1); return true; }
    if (op.kind === 'patch') { Object.assign(items[i], op.patch); if (op.patch.tags) items[i].tags = op.patch.tags.slice(); return true; }
    return false;
  }

  function today() { var d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
  function prettyDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso); if (!m) return iso;
    var names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return Number(m[3]) + ' ' + names[Number(m[2]) - 1] + ' ' + m[1];
  }
  function toBase64(text) {
    var bytes = new TextEncoder().encode(text), bin = '';
    for (var i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    return btoa(bin);
  }
  function fromBase64(b64) {
    var bin = atob(String(b64).replace(/\s/g, '')), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  /* Shared text (a pasted list, a link, text read from a screenshot) -> title suggestions. */
  var JUNK = /^(\d{1,2}:\d{2}|[\d.,]+\s*[km]?(\s*(views|likes|replies|weergaven))?|follow|following|volgen|reply|share|thread|top|view activity.*|add your reply.*|\d+\s*[hmdu]|\d+\s*\/\s*\d+|\W+)$/i;
  function extract(text) {
    var lines = String(text || '').split(/\r?\n/).map(tidy).filter(Boolean), out = [], seen = {}, urls = [];
    function push(title, note, sure) {
      title = tidy(title).replace(/^(\d{1,2}[.)]\s+|[-•*]\s+)/, '').replace(/[\s.,;:!–—-]+$/, '');
      var k = key(title);
      if (title.length < 2 || title.length > 80 || !k || seen[k]) return;
      seen[k] = true; out.push({ title: title, note: note || '', url: '', sure: !!sure });
    }
    var rest = [];
    lines.forEach(function (line) {
      if (/^https?:\/\/\S+$/i.test(line)) { urls.push(line); return; }
      var m = line.match(/^(?:\d{1,2}[.)]\s+|[-•*]\s+)?(.{2,70}?)\s*\(((?:19|20)\d{2})\)/);
      if (m) { push(m[1], m[2], true); return; }
      m = line.match(/^\d{1,2}[.)]\s+(.{2,80})$/);
      if (m) { push(m[1].split(/\s[-–—:]\s|,\s|\.\s/)[0], '', true); return; }
      rest.push(line);
    });
    if (!out.length) {
      var plain = rest.filter(function (l) { return !JUNK.test(l) && l.length >= 2 && l.length <= 70; });
      var sure = plain.length <= 3;
      plain.slice(0, 30).forEach(function (l) { push(l, '', sure); });
    }
    if (!out.length && urls.length) {
      var name = '';
      try { var u = new URL(urls[0]); var seg = u.pathname.split('/').filter(Boolean).pop() || ''; name = /[a-z]{3}/i.test(seg) ? decodeURIComponent(seg).replace(/[-_+]+/g, ' ') : u.hostname.replace(/^www\./, ''); } catch (e) { name = urls[0]; }
      push(name, '', false);
    }
    if (out.length === 1 && urls.length) out[0].url = urls[0];
    return out;
  }

  var api = { extract: extract, parse: parse, serialize: serialize, line: line, key: key, tidy: tidy, tidyNote: tidyNote, guessType: guessType, fromInput: fromInput, apply: apply, today: today, prettyDate: prettyDate, toBase64: toBase64, fromBase64: fromBase64 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.WatchCore = api;
})(typeof window !== 'undefined' ? window : this);
