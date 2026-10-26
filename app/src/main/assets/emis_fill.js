(function () {
  var VER = 15;
  if (window.__emisPanel && window.__emisVer === VER && document.body.contains(window.__emisPanel)) { window.__emisPanel.style.display = 'block'; return; }
  if (window.__emisPanel) { if (window.__emisStop) window.__emisStop(); window.__emisPanel.remove(); }
  if (window.__emisKeys) document.removeEventListener('keydown', window.__emisKeys, true);
  window.__emisVer = VER;
  var KEY = 'emisFill_v1';
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || { h: [], rows: [], i: 0 }; } catch (e) { return { h: [], rows: [], i: 0 }; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} }
  var D = load();
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;

  function digits(s) { return String(s).replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); }).replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); }); }
  function norm(s) {
    return (s || '').replace(/[*:؟?]/g, '').replace(/[\u064B-\u0652\u0640]/g, '')
      .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/[ىی]/g, 'ي').replace(/ک/g, 'ك')
      .replace(/\s+/g, ' ').trim();
  }
  function p2(n) { return ('0' + n).slice(-2); }
  function parseDate(v) {
    v = digits(v).trim();
    if (/^\d{5}$/.test(v)) { var d = new Date(Date.UTC(1899, 11, 30) + (+v) * 864e5); return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()]; }
    var m = v.match(/^(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
    if (m) return [+m[1], +m[2], +m[3]];
    m = v.match(/^(\d{1,2})\D+(\d{1,2})\D+(\d{4})/);
    if (m) { var a = +m[1], b = +m[2]; if (b > 12 && a <= 12) { var t = a; a = b; b = t; } return [+m[3], b, a]; }
    m = v.match(/^(\d{2})(\d{2})(\d{4})$/);
    if (m) return [+m[3], +m[2], +m[1]];
    return null;
  }
  function dateFormats(v) {
    var x = parseDate(v); if (!x) return [v];
    var y = x[0], mo = p2(x[1]), d = p2(x[2]);
    return [y + '-' + mo + '-' + d, d + '-' + mo + '-' + y, d + mo + y, d + '/' + mo + '/' + y];
  }
  function visible(el) { return el && el.offsetParent !== null; }

  function findField(name) {
    var n = norm(name);
    var labels = document.querySelectorAll('label.text-subtitle2[for]');
    for (var i = 0; i < labels.length; i++) {
      if (norm(labels[i].textContent) === n) {
        var el = document.getElementById(labels[i].htmlFor);
        if (el && visible(el)) return el;
      }
    }
    var cbs = document.querySelectorAll('[role=checkbox][aria-label]');
    for (var j = 0; j < cbs.length; j++) if (norm(cbs[j].getAttribute('aria-label')).replace(/[؟?]/g, '').trim() === n.replace(/[؟?]/g, '').trim() && visible(cbs[j])) return cbs[j];
    return null;
  }

  function setInput(el, v) {
    el.focus();
    try { el.select(); } catch (e) {}
    var ok = false;
    try { ok = document.execCommand('insertText', false, v); } catch (e) {}
    if (!ok || el.value !== v) {
      setter.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.blur();
  }
  function hasErr(el) { var f = el.closest('.q-field'); return f && f.classList.contains('q-field--error'); }
  function closePopups() {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    document.body.click();
  }
  async function setDate(el, v) {
    var x = parseDate(v); if (!x) return false;
    var want = x[0] + '-' + p2(x[1]) + '-' + p2(x[2]);
    var tries = [want, want.replace(/-/g, '')];
    for (var i = 0; i < tries.length; i++) {
      setInput(el, ''); await sleep(100);
      setInput(el, tries[i]); await sleep(300); closePopups(); await sleep(300);
      if (el.value === want) return true;
    }
    return false;
  }
  function nodeText(h) { var c = h.querySelector('.q-tree__node-header-content'); return c ? norm(c.textContent) : ''; }
  function headersIn(scope) {
    return Array.prototype.filter.call(scope.querySelectorAll('.q-tree__node-header'), visible);
  }
  function childHeaders(node) {
    var ch = node.querySelector(':scope > .q-tree__node-collapsible > .q-tree__children');
    if (!ch) return [];
    return Array.prototype.filter.call(ch.querySelectorAll(':scope > .q-tree__node > .q-tree__node-header'), visible);
  }
  function matchHeader(list, name) {
    var n = norm(name), ex = list.filter(function (h) { return nodeText(h) === n; });
    if (ex.length) return ex[0];
    var part = list.filter(function (h) { return nodeText(h).indexOf(n) >= 0; });
    return part.length === 1 ? part[0] : null;
  }
  async function expand(h) {
    if (h.getAttribute('aria-expanded') === 'true') return true;
    var arrow = h.querySelector('.q-tree__arrow');
    (arrow || h).click();
    var node = h.closest('.q-tree__node');
    for (var t = 0; t < 150; t++) { await sleep(200); if (h.getAttribute('aria-expanded') === 'true' && childHeaders(node).length) return true; }
    return h.getAttribute('aria-expanded') === 'true';
  }
  async function setTree(el, v) {
    var parts = v.split(/\s*[\/>»\\،]\s*/).filter(Boolean);
    if (norm(parts[0]) !== norm('العراق')) parts.unshift('العراق');
    var box = el.closest('.column') || el.closest('form');
    if (el.value) { setInput(el, ''); await sleep(500); }
    var tree = await waitFor(function () { var t = box.querySelector('.q-tree'); return t && headersIn(t).length ? t : null; }, 30000);
    if (!tree) return 'empty';
    var level = headersIn(tree).filter(function (h) { return h.parentElement.parentElement === tree; });
    if (!level.length) level = headersIn(tree);
    var h = null;
    for (var i = 0; i < parts.length; i++) {
      h = null;
      for (var t = 0; t < 15 && !h; t++) { h = matchHeader(level, parts[i]); if (!h) await sleep(200); }
      if (!h) {
        // fallback: search box with this name
        setInput(el, parts[i]); el.focus();
        for (var k = 0; k < 25 && !h; k++) { await sleep(200); h = matchHeader(headersIn(tree), parts[i]); }
        if (!h) return false;
      }
      if (i < parts.length - 1) {
        if (!(await expand(h))) return 'empty';
        level = childHeaders(h.closest('.q-tree__node'));
        if (!level.length) return 'empty';
      }
    }
    (h.querySelector('.q-tree__node-header-content') || h).click();
    await sleep(600);
    return true;
  }
  function options() {
    return Array.prototype.filter.call(document.querySelectorAll('.q-menu [role=option], .q-menu .q-item'), visible);
  }
  var ORD = { 'اول': 1, 'اولي': 1, 'ثاني': 2, 'ثانيه': 2, 'ثالث': 3, 'ثالثه': 3, 'رابع': 4, 'رابعه': 4, 'خامس': 5, 'خامسه': 5, 'سادس': 6, 'سادسه': 6 };
  var STOP = { 'صف': 1, 'مرحله': 1, 'شعبه': 1, 'من': 1, 'في': 1 };
  function toks(s) {
    return norm(digits(s)).split(/[\s\-_\/()]+/).map(function (w) {
      w = w.replace(/^(و?ال)/, '');
      if (ORD[w]) return String(ORD[w]);
      return w;
    }).filter(function (w) { return w && !STOP[w]; });
  }
  function score(a, b) {
    var ta = toks(a), tb = toks(b), sc = 0;
    ta.forEach(function (w) { if (tb.indexOf(w) >= 0) sc += /^\d+$/.test(w) ? 3 : 2; else if (tb.some(function (x) { return x.length > 2 && w.length > 2 && (x.indexOf(w) >= 0 || w.indexOf(x) >= 0); })) sc += 1; });
    return sc;
  }
  function pick(v) {
    var n = norm(v), opts = options(), best = null;
    for (var i = 0; i < opts.length; i++) { if (norm(opts[i].textContent) === n) return opts[i]; }
    for (var j = 0; j < opts.length; j++) {
      var t = norm(opts[j].textContent);
      if (t && (t.indexOf(n) >= 0 || n.indexOf(t) >= 0)) { if (!best || t.length < norm(best.textContent).length) best = opts[j]; }
    }
    if (best) return best;
    var top = 0, cnt = 0;
    for (var k = 0; k < opts.length; k++) {
      var sc = score(v, opts[k].textContent);
      if (sc > top) { top = sc; best = opts[k]; cnt = 1; } else if (sc === top && sc > 0) cnt++;
    }
    return top > 0 && cnt === 1 ? best : null;
  }
  function typeFilter(el, txt) {
    setter.call(el, txt);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function variants(v) {
    var out = [v];
    var plain = v.replace(/[أإآ]/g, 'ا'); out.push(plain);
    out.push(plain.replace(/ى/g, 'ي'), plain.replace(/ى/g, 'ی'), v.replace(/ى/g, 'ی'));
    out.push(plain.replace(/ة/g, 'ه'));
    var core = norm(v);
    v.split(/\s+/).sort(function (a, b) { return b.length - a.length; }).forEach(function (w) { if (w.length > 2) { out.push(w); out.push(w.replace(/^ال/, '')); } });
    if (core.length > 3) out.push(v.slice(1, -1));
    if (core.length > 4) out.push(v.slice(1, 4));
    return out.filter(function (x, i) { return x && out.indexOf(x) === i; });
  }
  async function setSelect(el, v) {
    el.focus(); el.click();
    var ctl = el.closest('.q-field__control'); if (ctl) ctl.click();
    var opt = null, loaded = false;
    for (var t = 0; t < 150 && !opt; t++) {
      await sleep(200);
      var os = options().filter(function (o) { return !/لا توجد|لا يوجد|no (data|results|options)/i.test(o.textContent); });
      if (os.length) { loaded = true; opt = pick(v); if (!opt) break; }
    }
    if (!loaded) {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
      el.blur(); return 'empty';
    }
    var vs = variants(v);
    for (var k = 0; k < vs.length && !opt; k++) {
      typeFilter(el, vs[k]);
      for (var t2 = 0; t2 < 8 && !opt; t2++) { await sleep(150); opt = pick(v); }
    }
    if (!opt) {
      typeFilter(el, '');
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
      el.blur(); return false;
    }
    opt.click();
    await sleep(300);
    el.blur();
    return true;
  }

  var busy = false, stopReq = false;
  var LOG = [];
  function vis(sel) { return Array.prototype.filter.call(document.querySelectorAll(sel), visible); }
  function iconBtn(cls) { var b = vis('main button .q-icon.' + cls); return b.length ? b[0].closest('button') : null; }
  async function waitFor(fn, ms) { var t = 0; while (t < ms) { var r = fn(); if (r) return r; if (stopReq) return null; await sleep(200); t += 200; } return fn(); }
  function fieldErrors() {
    return vis('.q-field--error').map(function (f) {
      var w = f.closest('.base-input-wrapper,.base-select-wrapper'); var l = w && w.querySelector('label.text-subtitle2');
      return l ? norm(l.textContent) : '؟';
    });
  }
  function onAddPage() { return /\/students\/management\/add\/?$/.test(location.pathname); }
  function nameEmpty() { var e = document.getElementById('base-input-الإسم'); return e && visible(e) && !e.value ? e : null; }

  var LEARN = {}; try { LEARN = JSON.parse(localStorage.getItem(KEY + '_learn')) || {}; } catch (e) {}
  function saveLearn() { try { localStorage.setItem(KEY + '_learn', JSON.stringify(LEARN)); } catch (e) {} }
  function shownText(el) {
    var nat = el.closest('.q-field__control'); nat = nat && nat.querySelector('.q-field__native');
    if (!nat) return '';
    var t = ''; nat.childNodes.forEach(function (n) { if (n.nodeType === 3 || (n.tagName && n.tagName !== 'INPUT')) t += n.textContent; });
    return t.trim();
  }
  function beep() { try { var c = new (window.AudioContext || window.webkitAudioContext)(), o = c.createOscillator(); o.connect(c.destination); o.frequency.value = 880; o.start(); setTimeout(function () { o.stop(); c.close(); }, 250); } catch (e) {} }
  function mark(el, on) { var f = el.closest('.q-field') || el; f.style.outline = on ? '3px solid #f57c00' : ''; f.style.borderRadius = on ? '6px' : ''; if (on) f.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  async function learnSelect(el, h, v) {
    var before = shownText(el);
    mark(el, true); beep();
    say('✋ لم أجد «' + v + '» في قائمة «' + h + '».\nاختر الخيار الصحيح بيدك من القائمة المعلَّمة باللون البرتقالي،\nوسأتذكره وأستخدمه تلقائياً لكل الطلاب القادمين.', '#e65100');
    var got = await waitFor(function () { var t = shownText(el); return t && t !== before && !/^اختر/.test(t) ? t : null; }, 900000);
    mark(el, false);
    if (!got || stopReq) return false;
    LEARN[h + '|' + v] = got; saveLearn(); await sleep(400);
    say('👍 تعلّمت: «' + v + '» = «' + got + '». أكمل...', 'green');
    return true;
  }
  function treePath(hdr) {
    var parts = [], n = hdr.closest('.q-tree__node');
    while (n) {
      var hh = n.querySelector(':scope > .q-tree__node-header .q-tree__node-header-content');
      if (hh) parts.unshift(hh.textContent.trim());
      n = n.parentElement && n.parentElement.closest('.q-tree__node');
    }
    if (parts.length && norm(parts[0]) === norm('العراق')) parts.shift();
    return parts.join('/');
  }
  async function learnTree(el, h, v) {
    var box = el.closest('.column') || el.closest('form');
    var sel0 = box.querySelector('.q-tree__node--selected');
    mark(box, true); beep();
    say('✋ لم أجد المكان «' + v + '».\nافتح الشجرة المعلَّمة باللون البرتقالي واضغط على المكان الصحيح بيدك،\nوسأتذكره لكل الطلاب القادمين.', '#e65100');
    var got = await waitFor(function () { var s1 = box.querySelector('.q-tree__node--selected'); return s1 && s1 !== sel0 ? s1 : null; }, 900000);
    mark(box, false);
    if (!got || stopReq) return false;
    var path = treePath(got); LEARN[h + '|' + v] = path; saveLearn(); await sleep(400);
    say('👍 تعلّمت المكان: «' + path + '». أكمل...', 'green');
    return true;
  }

  async function fillPage(r) {
    var failed = [], filled = 0;
    for (var c = 0; c < D.h.length; c++) {
      if (stopReq) break;
      var h = D.h[c], v = (r[c] || '').trim();
      if (!h || !v) continue;
      var el = findField(h);
      if (!el) {
        var trig = /الشعبة/.test(h) ? 'الصف الدراسي' : (/رقم البطاقة|جهة|السجل|الصح/.test(h) ? 'نوع الهوية' : null);
        if (trig && findField(trig)) el = await waitFor(function () { return findField(h); }, 15000);
      }
      if (!el) continue;
      try {
        if (el.getAttribute('role') === 'checkbox') {
          var want = /^(نعم|1|yes|true|✓)$/i.test(v);
          if ((el.getAttribute('aria-checked') === 'true') !== want) { el.click(); await sleep(400); }
          filled++;
        } else if (el.closest('.q-select')) {
          var sv = LEARN[h + '|' + v] || v, rs = await setSelect(el, sv);
          if (rs === 'empty') { failed.push('EMPTY:' + h); break; }
          if (rs === true || (sv !== v && await setSelect(el, v) === true) || await learnSelect(el, h, v)) filled++; else failed.push(h + ' (' + v + ')');
        } else if (el.id.indexOf('base-datepicker') === 0) {
          if (await setDate(el, v)) filled++; else failed.push(h + ' (' + v + ')');
        } else if ((el.closest('.column') || document).querySelector('.q-tree') && /بحث/.test(el.placeholder || '')) {
          var tv = LEARN[h + '|' + v] || v, rt = await setTree(el, tv);
          if (rt === 'empty') { failed.push('EMPTY:' + h); break; }
          if (rt === true || await learnTree(el, h, v)) filled++; else failed.push(h + ' (' + v + ')');
        } else {
          setInput(el, /هاتف|رقم/.test(h) ? digits(v).replace(/\s/g, '') : v); filled++; await sleep(50);
        }
      } catch (e) { failed.push(h); }
    }
    return { filled: filled, failed: failed };
  }

  async function fill() {
    if (busy) return;
    var r = D.rows[D.i];
    if (!r) { say('لا يوجد طالب بهذا الرقم — حمّل البيانات أولاً', 'red'); return; }
    busy = true; stopReq = false; say('جاري التعبئة...', '#555');
    var res = await fillPage(r);
    busy = false;
    say('تمت تعبئة ' + res.filled + ' حقل.' + (res.failed.length ? '\n⚠️ لم أجد الخيار: ' + res.failed.join('، ') : ''), res.failed.length ? '#b45309' : 'green');
  }

  async function goToAdd() {
    var addPath = location.pathname.replace(/\/students\/management.*$/, '/students/management/add');
    if (!/\/students\/management/.test(location.pathname)) addPath = sessionStorage.getItem('emisAddPath') || addPath;
    var app = document.querySelector('#q-app'); var router = app && app.__vue_app__ && app.__vue_app__.config.globalProperties.$router;
    if (onAddPage()) {
      var list = addPath.replace(/\/add$/, '');
      if (router) await router.push(list); else { history.pushState(null, '', list); dispatchEvent(new PopStateEvent('popstate')); }
      await sleep(600);
    }
    if (router) await router.push(addPath); else { history.pushState(null, '', addPath); dispatchEvent(new PopStateEvent('popstate')); }
    return await waitFor(nameEmpty, 45000);
  }

  var SAVED = {}; try { SAVED = JSON.parse(localStorage.getItem(KEY + '_saved')) || {}; } catch (e) {}
  function saveSaved() { try { localStorage.setItem(KEY + '_saved', JSON.stringify(SAVED)); } catch (e) {} }
  function rowKey(i) {
    var r = D.rows[i] || [], parts = [];
    ['الإسم', 'إسم الأب', 'اسم والد الأب', 'اللقب', 'إسم الأم', 'تاريخ التولّد'].forEach(function (h) {
      var c = -1; for (var k = 0; k < D.h.length; k++) if (norm(D.h[k]) === norm(h)) { c = k; break; }
      parts.push(c >= 0 ? norm(r[c] || '') : '');
    });
    return parts.join('|');
  }
  async function confirmDialog() {
    var d = vis('.q-dialog .q-card');
    if (!d.length) return false;
    if (/موجود|مكرر|مسبق|تكرار|سابق/.test(d[d.length - 1].textContent)) return 'dup';
    var bs = d[d.length - 1].querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) if (/نعم|تأكيد|موافق|حفظ|متابعة/.test(bs[i].textContent)) { bs[i].click(); return true; }
    return false;
  }

  function failMsg(who, f) {
    var e = f.filter(function (x) { return x.indexOf('EMPTY:') === 0; });
    if (e.length) return 'SESSION:' + who + ': قائمة «' + e[0].slice(6) + '» لم تُحمَّل من المنصة خلال 30 ثانية';
    return who + ': لم أجد الخيار ← ' + f.join('، ');
  }
  async function oneStudent() {
    var r = D.rows[D.i], who = 'الطالب ' + (D.i + 1);
    if (!onAddPage() || !nameEmpty()) { if (!(await goToAdd())) return who + ': لم تفتح استمارة إضافة جديدة'; }
    var a = await fillPage(r);
    if (stopReq) return 'أوقفت يدوياً';
    if (a.failed.length) return failMsg(who, a.failed);
    await sleep(300);
    var nx = iconBtn('fa-arrow-left'); if (!nx) return who + ': لم أجد زر الانتقال للصفحة الثانية';
    nx.click();
    var t2 = await waitFor(function () { return findField('الصف الدراسي'); }, 30000);
    if (!t2) { var er = fieldErrors(); return who + ': المنصة رفضت الصفحة الأولى' + (er.length ? ' ← ' + er.join('، ') : ''); }
    await sleep(400);
    var b = await fillPage(r);
    if (stopReq) return 'أوقفت يدوياً';
    if (b.failed.length) return failMsg(who, b.failed);
    if (fieldErrors().length) return who + ': حقول ناقصة أو خاطئة ← ' + fieldErrors().join('، ');
    var sv = iconBtn('fa-floppy-disk'); if (!sv) return who + ': لم أجد زر الحفظ';
    var before = location.pathname, nameEl = document.getElementById('base-input-الإسم');
    var seenPos = vis('.q-notification.bg-positive').length;
    function savedSignal() {
      if (location.pathname !== before) return 'ok';
      if (vis('.q-notification.bg-positive').length > seenPos) return 'ok';
      if (!iconBtn('fa-floppy-disk') && !findField('الصف الدراسي')) return 'ok';
      if (nameEl && !document.body.contains(nameEl) && !findField('الصف الدراسي')) return 'ok';
      return null;
    }
    var manual = !autoSave.checked;
    if (manual) {
      say('✋ ' + who + ' جاهز. راجع البيانات واضغط زر الحفظ في المنصة.\nبعد نجاح الحفظ سأفتح الطالب التالي وحدي.', '#1565c0');
      var okm = await waitFor(savedSignal, 3600000);
      if (okm !== 'ok') return stopReq ? 'أوقفت يدوياً' : who + ': انتهى وقت الانتظار';
    }
    if (!manual) { SAVED[rowKey(D.i)] = 'maybe'; saveSaved(); sv.click(); }
    var ok = manual ? 'ok' : await waitFor(function () {
      if (vis('.q-dialog .q-card').length) { return confirmDialog() === 'dup' ? 'dup' : null; }
      if (vis('.q-notification.bg-negative, .q-notification.text-negative').length) return 'bad';
      if (fieldErrors().length) return 'bad';
      return savedSignal();
    }, 60000);
    if (ok === 'dup') { delete SAVED[rowKey(D.i)]; saveSaved(); return 'DUP:' + who + ': المنصة تقول إن هذا الطالب موجود مسبقاً. لم أضغط تأكيد.'; }
    if (ok === 'bad') { delete SAVED[rowKey(D.i)]; saveSaved(); }
    if (!ok) return 'MAYBE:' + who;
    if (ok !== 'ok') {
      var n = vis('.q-notification').map(function (x) { return x.textContent.trim(); }).join(' | ');
      return who + ': لم يتم الحفظ' + (n ? ' ← ' + n : '') + (fieldErrors().length ? ' ← ' + fieldErrors().join('، ') : '');
    }
    SAVED[rowKey(D.i)] = 'ok'; saveSaved();
    LOG.push((D.i + 1) + ' ✓ ' + [0, 1, 2, 4].map(function (k) { return r[k] || ''; }).join(' '));
    try { localStorage.setItem(KEY + '_log', JSON.stringify(LOG)); } catch (e) {}
    return null;
  }

  async function runAuto() {
    if (busy) return;
    if (!D.rows.length) { say('الخطوة 1 أولاً: الصق بيانات الطلاب من Excel.', 'red'); return; }
    var from = parseInt(fromIn.value, 10), to = parseInt(toIn.value, 10);
    if (!(from >= 1 && from <= D.rows.length)) { say('رقم «من الطالب» غير صحيح (من 1 إلى ' + D.rows.length + ')', 'red'); return; }
    if (!(to >= from && to <= D.rows.length)) { say('رقم «إلى الطالب» يجب أن يكون بين ' + from + ' و ' + D.rows.length, 'red'); return; }
    if (onAddPage()) sessionStorage.setItem('emisAddPath', location.pathname);
    D.i = from - 1; save();
    var total = to - from + 1, done = 0, skipped = 0;
    busy = true; stopReq = false; setRunning(true);
    while (D.i < to && !stopReq) {
      progress(done, total);
      var st = SAVED[rowKey(D.i)];
      if (st === 'ok') { skipped++; D.i++; save(); continue; }
      if (st === 'maybe') {
        busy = false; setRunning(false); fromIn.value = D.i + 1; refresh();
        showMaybe(D.i); return;
      }
      say('⏳ جاري العمل على الطالب رقم ' + (D.i + 1) + ': ' + nameOf(D.i), '#1565c0');
      var err = await oneStudent();
      if (err && err.indexOf('MAYBE:') === 0) { busy = false; setRunning(false); fromIn.value = D.i + 1; refresh(); showMaybe(D.i); return; }
      if (err) {
        busy = false; setRunning(false); fromIn.value = D.i + 1; refresh();
        if (err.indexOf('SESSION:') === 0) {
          say('⛔ توقفت عند الطالب رقم ' + (D.i + 1) + '\nالسبب: ' + err.slice(8).replace(/^الطالب \d+: /, '') + '.\nغالباً انتهت جلسة الدخول بعد التوقف عن العمل.\n\nالحل: اضغط F5 لتحديث الصفحة (وسجّل الدخول إن طُلب)، ثم افتح «إضافة طالب» واضغط زر «تعبئة EMIS» واضغط ابدأ. الرقم ' + (D.i + 1) + ' مكتوب لك جاهزاً.', 'red');
          return;
        }
        say('⛔ توقفت عند الطالب رقم ' + (D.i + 1) + '\nالسبب: ' + err.replace(/^DUP:/, '').replace(/^الطالب \d+: /, '') +
          '\n\nالحل: اضغط ابدأ مرة أخرى بعد تصحيح البيانات في Excel (الطالب لم يُحفظ).\nإذا صحّحته وحفظته بيدك، اكتب في «من الطالب» الرقم ' + (D.i + 2) + '.', 'red');
        return;
      }
      done++; D.i++; save(); progress(done, total);
    }
    busy = false; setRunning(false);
    fromIn.value = Math.min(D.i + 1, D.rows.length); toIn.value = Math.min(D.i + total, D.rows.length); refresh();
    say((stopReq ? '■ أوقفته. ' : '✅ انتهى! ') + 'تم إدخال ' + done + ' طالب.' + (skipped ? ' (تخطيت ' + skipped + ' طالب محفوظ سابقاً)' : '') + (D.i < D.rows.length ? '\nالدفعة التالية جاهزة: اضغط ابدأ.' : '\nتم إدخال جميع الطلاب 🎉'), 'green');
  }

  // ================= واجهة اللوحة =================
  var css = document.createElement('style');
  css.textContent = '#emisP{position:fixed;left:14px;bottom:14px;z-index:2147483647;width:340px;background:#fff;color:#1a1a1a;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.28);font:14px Tahoma,Arial,sans-serif;direction:rtl;overflow:hidden}' +
    '#emisP *{box-sizing:border-box;font-family:inherit}' +
    '#emisP .hd{background:#1565c0;color:#fff;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;font-weight:bold;cursor:move}' +
    '#emisP .hd button{background:transparent;border:0;color:#fff;font-size:18px;cursor:pointer;padding:0 4px}' +
    '#emisP .bd{padding:12px 14px;max-height:75vh;overflow:auto}' +
    '#emisP .st{border:1px solid #e3e8ef;border-radius:10px;padding:10px;margin-bottom:10px}' +
    '#emisP .st h4{margin:0 0 8px;font-size:14px;color:#1565c0}' +
    '#emisP .num{display:inline-block;background:#1565c0;color:#fff;border-radius:50%;width:22px;height:22px;text-align:center;line-height:22px;margin-left:6px;font-size:12px}' +
    '#emisP .b{border:0;border-radius:8px;padding:8px 12px;cursor:pointer;color:#fff;font-size:14px}' +
    '#emisP .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}' +
    '#emisP input[type=number]{width:70px;padding:6px;border:1px solid #c7d0db;border-radius:6px;font-size:15px;text-align:center}' +
    '#emisP textarea{width:100%;height:90px;font-size:11px;border:1px solid #c7d0db;border-radius:6px;margin-top:6px}' +
    '#emisP .opt{display:block;padding:6px 8px;border:1px solid #e3e8ef;border-radius:8px;margin:4px 0;cursor:pointer}' +
    '#emisP .opt small{display:block;color:#666;margin-right:22px}' +
    '#emisP .go{width:100%;padding:12px;font-size:17px;font-weight:bold;border-radius:10px}' +
    '#emisP .bar{height:10px;background:#e3e8ef;border-radius:5px;overflow:hidden;margin:8px 0 4px}' +
    '#emisP .bar i{display:block;height:100%;width:0;background:#2e7d32;transition:width .3s}' +
    '#emisP .msg{white-space:pre-wrap;font-size:13px;line-height:1.7;min-height:20px}' +
    '#emisP .hint{font-size:12px;color:#555;line-height:1.7}' +
    '#emisP.min .bd{display:none}';
  document.head.appendChild(css);

  var P = document.createElement('div'); P.id = 'emisP';
  window.__emisPanel = P;
  P.innerHTML =
    '<div class="hd"><span>مساعد إدخال الطلاب — EMIS <small style="opacity:.7">(إصدار ' + VER + ')</small></span><span><button data-a="min" title="تصغير">—</button><button data-a="close" title="إغلاق">✕</button></span></div>' +
    '<div class="bd">' +
    '<div class="st"><h4><span class="num">1</span>بيانات الطلاب</h4>' +
    '<div class="row"><span data-r="loaded" style="flex:1"></span><button class="b" data-a="paste" style="background:#6a1b9a">📋 لصق من Excel</button></div>' +
    '<div data-r="pastebox" style="display:none"><div class="hint">في Excel: حدّد صف العناوين مع صفوف الطلاب ← Ctrl+C ← ثم الصق هنا بـ Ctrl+V</div>' +
    '<textarea data-r="ta"></textarea><div class="row"><button class="b" data-a="savedata" style="background:#2e7d32">✓ حفظ البيانات</button><button class="b" data-a="cancel" style="background:#9e9e9e">إلغاء</button></div></div></div>' +
    '<div class="st"><h4><span class="num">2</span>أي الطلاب تريد إدخالهم؟</h4>' +
    '<div class="row">من الطالب رقم <input type="number" min="1" data-r="from"> إلى <input type="number" min="1" data-r="to"></div>' +
    '<div class="hint" data-r="preview" style="margin-top:6px"></div></div>' +
    '<div class="st"><h4><span class="num">3</span>من يضغط زر الحفظ؟</h4>' +
    '<label class="opt"><input type="radio" name="emisMode" value="manual"> <b>أنا أراجع وأحفظ بنفسي</b><small>يملأ الطالب وينتظرك تضغط حفظ في المنصة، ثم ينتقل للتالي. مناسب للتجربة.</small></label>' +
    '<label class="opt"><input type="radio" name="emisMode" value="auto"> <b>يحفظ وحده</b><small>يملأ ويحفظ وينتقل للتالي بدون توقف. للدفعات الكبيرة بعد التأكد.</small></label></div>' +
    '<button class="b go" data-a="go" style="background:#c62828">▶ ابدأ</button>' +
    '<div class="bar"><i data-r="bar"></i></div><div class="hint" data-r="prog"></div>' +
    '<div class="msg" data-r="msg"></div>' +
    '<details class="hint" style="margin-top:8px"><summary style="cursor:pointer;color:#1565c0">كيف يعمل؟</summary>' +
    'لكل طالب يقوم المساعد بـ: ملء صفحة «المعلومات الشخصية» ← الضغط على السهم للانتقال إلى صفحة «بيانات الطالب» وملئها ← الحفظ (منك أو منه) ← بعد نجاح الحفظ يفتح استمارة «إضافة طالب» جديدة وحده ← ينتقل للطالب التالي، حتى يصل إلى الرقم الذي حددته.<br>' +
    'إذا لم يجد خياراً في قائمة أو مكاناً في الشجرة، يطلب منك اختياره بيدك مرة واحدة ويتذكره لباقي الطلاب.<br>' +
    'إذا رفضت المنصة أي حقل يتوقف فوراً ويخبرك بالسبب، ولا يتخطى أي طالب.<br>' +
    '<a href="#" data-a="forget" style="color:#c62828">نسيان الاختيارات التي تعلّمها</a><br>' +
    '<a href="#" data-a="clearsaved" style="color:#c62828">مسح سجل الطلاب المحفوظين (لا يحذف شيئاً من المنصة)</a><br>' +
    '<a href="#" data-a="wipe" style="color:#c62828">حذف الكود المحفوظ (للهاتف، عند التحديث)</a><br>لا تغلق الصفحة ولا تتنقل فيها أثناء العمل.</details>' +
    '</div>';
  document.body.appendChild(P);
  function R(n) { return P.querySelector('[data-r="' + n + '"]'); }
  var fromIn = R('from'), toIn = R('to'), ta = R('ta');
  var autoSave = { get checked() { var r = P.querySelector('input[name=emisMode]:checked'); return r && r.value === 'auto'; } };
  var mode = 'manual'; try { if (localStorage.getItem(KEY + '_auto') === '1') mode = 'auto'; } catch (e) {}
  P.querySelector('input[value=' + mode + ']').checked = true;
  P.querySelectorAll('input[name=emisMode]').forEach(function (r) { r.onchange = function () { try { localStorage.setItem(KEY + '_auto', autoSave.checked ? '1' : '0'); } catch (e) {} }; });

  function nameOf(i) { var r = D.rows[i] || []; return [0, 1, 2, 4].map(function (k) { return (r[k] || '').trim(); }).join(' ').trim(); }
  function say(t, col) { var m = R('msg'); m.textContent = t; m.style.color = col || '#1a1a1a'; }
  function progress(done, total) { R('bar').style.width = (total ? done * 100 / total : 0) + '%'; R('prog').textContent = total ? 'تم ' + done + ' من ' + total : ''; }
  function refresh() {
    R('loaded').innerHTML = D.rows.length ? '✅ محمّل: <b>' + D.rows.length + '</b> طالب' : '<span style="color:#c62828">لا توجد بيانات بعد</span>';
    if (!fromIn.value) fromIn.value = Math.min(D.i + 1, Math.max(D.rows.length, 1));
    if (!toIn.value) toIn.value = D.rows.length || '';
    var f = parseInt(fromIn.value, 10), t = parseInt(toIn.value, 10);
    R('preview').innerHTML = D.rows.length && f >= 1 && f <= D.rows.length ?
      'يبدأ من: <b>' + nameOf(f - 1) + '</b>' + (t >= f && t <= D.rows.length ? '<br>وينتهي عند: <b>' + nameOf(t - 1) + '</b> (المجموع ' + (t - f + 1) + ' طالب)' : '') : '';
  }
  function showMaybe(i) {
    var m = R('msg'); m.style.color = '#b45309';
    m.innerHTML = '⚠️ <b>الطالب رقم ' + (i + 1) + ': ' + nameOf(i) + '</b><br>ضغطت حفظ لكن لم أتأكد هل حُفظ أم لا، فتوقفت حتى لا يتكرر.<br>' +
      '<b>افتح قائمة الطلاب في المنصة وابحث عنه</b>، ثم اختر:<br>' +
      '<button class="b" data-a="m-ok" style="background:#2e7d32;margin:6px 2px">موجود ← تخطَّه</button>' +
      '<button class="b" data-a="m-no" style="background:#c62828;margin:6px 2px">غير موجود ← أدخله</button>';
    m.setAttribute('data-i', i);
  }
  function setRunning(on) {
    var g = P.querySelector('[data-a=go]');
    g.textContent = on ? '■ أوقف' : '▶ ابدأ'; g.style.background = on ? '#424242' : '#c62828';
    fromIn.disabled = toIn.disabled = on;
  }
  fromIn.oninput = toIn.oninput = refresh;
  P.addEventListener('click', function (e) {
    var a = e.target.closest('[data-a]'); if (!a) return; a = a.getAttribute('data-a');
    if (a === 'min') P.classList.toggle('min');
    else if (a === 'm-ok' || a === 'm-no') {
      var mi = +R('msg').getAttribute('data-i');
      if (a === 'm-ok') { SAVED[rowKey(mi)] = 'ok'; fromIn.value = mi + 2; } else { delete SAVED[rowKey(mi)]; fromIn.value = mi + 1; }
      saveSaved(); refresh(); say('تم. اضغط ▶ ابدأ للمتابعة.', 'green');
    }
    else if (a === 'wipe') { e.preventDefault(); try { localStorage.removeItem('emisCode'); } catch (x) {} say('تم حذف الكود. في المرة القادمة سيطلب منك لصق الكود الجديد.', 'green'); }
    else if (a === 'clearsaved') { e.preventDefault(); if (confirm('مسح السجل يعني أن المساعد قد يعيد إدخال طلاب محفوظين. متأكد؟')) { SAVED = {}; saveSaved(); say('تم مسح السجل.', 'green'); } }
    else if (a === 'forget') { e.preventDefault(); LEARN = {}; saveLearn(); say('تم مسح الاختيارات المحفوظة.', 'green'); }
    else if (a === 'close') { stopReq = true; P.style.display = 'none'; }
    else if (a === 'paste') { R('pastebox').style.display = 'block'; ta.focus(); }
    else if (a === 'cancel') { ta.value = ''; R('pastebox').style.display = 'none'; }
    else if (a === 'savedata') {
      var lines = ta.value.replace(/\r/g, '').split('\n').filter(function (l) { return l.replace(/\t/g, '').trim(); });
      if (lines.length < 2) { say('الصق صف العناوين وطالباً واحداً على الأقل.', 'red'); return; }
      var hd = lines[0].split('\t').map(function (x) { return x.trim(); });
      if (!hd.some(function (x) { return norm(x) === norm('الإسم'); })) { say('لم أجد صف العناوين. تأكد أنك نسخت الصف الأول (الإسم، إسم الأب...) مع الطلاب.', 'red'); return; }
      D = { h: hd, rows: lines.slice(1).map(function (l) { return l.split('\t'); }), i: 0 };
      save(); ta.value = ''; R('pastebox').style.display = 'none';
      fromIn.value = 1; toIn.value = D.rows.length; refresh(); say('✅ تم حفظ ' + D.rows.length + ' طالب. البيانات تبقى محفوظة في متصفحك.', 'green');
    }
    else if (a === 'go') { if (busy) { stopReq = true; say('سيتوقف بعد الخطوة الحالية...', '#b45309'); } else runAuto(); }
  });
  // سحب اللوحة
  (function () { var hd = P.querySelector('.hd'), sx, sy, sl, sb; hd.onmousedown = function (e) { if (e.target.tagName === 'BUTTON') return; sx = e.clientX; sy = e.clientY; var r = P.getBoundingClientRect(); sl = r.left; sb = innerHeight - r.bottom;
    document.onmousemove = function (m) { P.style.left = (sl + m.clientX - sx) + 'px'; P.style.bottom = (sb - (m.clientY - sy)) + 'px'; }; document.onmouseup = function () { document.onmousemove = document.onmouseup = null; }; }; })();
  window.__emisStop = function () { stopReq = true; };
  refresh();
})();
