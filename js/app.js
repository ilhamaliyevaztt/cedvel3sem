/* Tətbiq məntiqi: həftə növbəsi, cədvəl, qayıb uçotu, statistika.
   Bütün iş brauzerdə gedir — server yoxdur, ünvan sətri dəyişmir. */
(function () {
  'use strict';

  var D = window.CEDVEL;
  var S = window.CedvelStore;
  var DAY_MS = 86400000;

  /* 2 noyabr 2026, bazar ertəsi — üst həftə.
     Həftə növləri bu tarixdən həftə-həftə növbələnir. */
  var ANCHOR = Date.UTC(2026, 10, 2);

  var state = {
    abs: {},
    weekShift: 0,
    theme: 'auto',
    viewOffset: 0,
    day: null,
    installEvent: null,
    swReg: null
  };

  var VIEWS = ['schedule', 'absences', 'stats', 'settings'];

  /* ---------------- köməkçilər ---------------- */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  function esc(v) {
    return String(v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function startOfDay(d) {
    var x = new Date(d.getTime());
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function mondayOf(d) {
    var x = startOfDay(d);
    var dow = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - dow);
    return x;
  }

  function addDays(d, n) {
    var x = new Date(d.getTime());
    x.setDate(x.getDate() + n);
    return x;
  }

  function utcDay(d) {
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function baseKind(monday) {
    var diff = Math.round((utcDay(monday) - ANCHOR) / (DAY_MS * 7));
    return ((diff % 2) + 2) % 2 === 0 ? 'ust' : 'alt';
  }

  function kindOf(monday) {
    var k = baseKind(monday);
    if (!state.weekShift) return k;
    return k === 'ust' ? 'alt' : 'ust';
  }

  function kindLabel(k) { return k === 'ust' ? 'Üst həftə' : 'Alt həftə'; }

  function fmtShort(d) { return pad2(d.getDate()) + '.' + pad2(d.getMonth() + 1); }
  function fmtLong(d) { return d.getDate() + ' ' + D.MONTHS[d.getMonth()]; }

  function displayMonday() {
    return addDays(mondayOf(new Date()), state.viewOffset * 7);
  }

  function slotTime(groupId, slot) {
    var t = D.GROUPS[groupId].times[slot];
    return t ? t[0] + '–' + t[1] : '';
  }

  function groupSpan(groupId) {
    var t = D.GROUPS[groupId].times;
    var first = t[1][0];
    var last = t[1][1];
    Object.keys(t).forEach(function (k) {
      if (t[k][0] < first) first = t[k][0];
      if (t[k][1] > last) last = t[k][1];
    });
    return first + '–' + last;
  }

  function absOf(key) {
    var v = state.abs[key];
    return typeof v === 'number' && isFinite(v) ? v : 0;
  }

  function trackedList() {
    return D.TRACKED.map(function (k) {
      var s = D.SUBJECTS[k];
      return { key: k, name: s.name, short: s.short, color: s.color, limit: s.limit };
    });
  }

  /* ---------------- tema ---------------- */

  function prefersDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function applyTheme(mode) {
    var dark = mode === 'dark' || (mode === 'auto' && prefersDark());
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#141917' : '#1f6f63');
    $$('.seg-btn[data-theme]').forEach(function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-theme') === mode);
    });
  }

  /* ---------------- toast ---------------- */

  var toastWrap = null;

  function toast(msg) {
    if (!toastWrap) {
      toastWrap = document.createElement('div');
      toastWrap.className = 'toast-wrap';
      document.body.appendChild(toastWrap);
    }
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    toastWrap.appendChild(el);
    setTimeout(function () {
      el.classList.add('is-out');
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 220);
    }, 2300);
  }

  /* ---------------- yaddaş ---------------- */

  function syncMeta() {
    var note = $('#storageNote');
    if (!note) return;
    var total = trackedList().reduce(function (n, s) { return n + absOf(s.key); }, 0);
    var label = S.isReady() ? 'IndexedDB' : 'brauzer yaddaşı';
    note.textContent = 'Yaddaş: ' + label + ' · ' + total + ' qayıb qeydi · cihazda saxlanılır.';
    note.classList.toggle('is-warn', !S.isReady());
  }

  /* Yaddaşa DƏRHAL yazır: localStorage sinxron gedir, IndexedDB arxa planda.
     Beləliklə səhifə dərhal bağlansa da qeyd itmir. */
  function persist() {
    syncMeta();
    S.set('abs', { values: state.abs, updatedAt: Date.now() });
  }

  /* ---------------- cədvəl ---------------- */

  function cardHtml(lesson, groupId) {
    var subj = D.SUBJECTS[lesson.subj];
    var time = slotTime(groupId, lesson.slot);
    var badges = '';
    if (subj.limit !== null && subj.limit !== undefined) {
      var a = absOf(lesson.subj);
      var full = a >= subj.limit;
      badges += '<span class="card-abs' + (full ? ' is-full' : '') + '">qayıb ' + a + '/' + subj.limit + '</span>';
    }
    return '' +
      '<article class="card" style="--sc:' + subj.color + '">' +
        '<div class="card-top">' +
          '<span class="card-time">' + time + '</span>' +
          '<span class="card-room">otaq ' + esc(lesson.room) + '</span>' +
        '</div>' +
        '<div class="card-name">' + esc(subj.name) + '</div>' +
        '<div class="card-sub">' +
          (lesson.kind ? '<span class="card-kind">' + esc(lesson.kind) + '</span>' : '') +
          badges +
        '</div>' +
      '</article>';
  }

  function emptyHtml(groupId, day, slot, kind, useDash) {
    var other = kind === 'ust' ? 'alt' : 'ust';
    var alt = D.lessonAt(groupId, day, slot, other);
    var note = '';
    if (alt) {
      note = '<span class="empty-note">' + kindLabel(other).toLowerCase() + ': ' +
        esc(D.SUBJECTS[alt.subj].short) + '</span>';
    }
    if (useDash) return '<div class="empty is-dash">—</div>';
    return '<div class="empty">dərs yoxdur' + note + '</div>';
  }

  function renderBoard() {
    var monday = displayMonday();
    var kind = kindOf(monday);
    var today = startOfDay(new Date());
    var isThisWeek = state.viewOffset === 0;
    var todayIdx = (today.getDay() + 6) % 7 + 1;

    var html = '' +
      '<div class="board-head">' +
        '<div class="bh-day">Gün</div>' +
        '<div class="bh-grp"><span class="av">N</span>Nurxan<small>' + groupSpan('nurxan') + '</small></div>' +
        '<div class="bh-grp is-sen"><span class="av">S</span>Sənubər<small>' + groupSpan('senuber') + '</small></div>' +
      '</div>';

    for (var day = 1; day <= 5; day++) {
      var date = addDays(monday, day - 1);
      var isToday = isThisWeek && day === todayIdx;
      var max = D.maxSlot(day, kind);
      var nurCount = D.lessonsFor('nurxan', day, kind).length;
      var senCount = D.lessonsFor('senuber', day, kind).length;

      html += '<div class="day-block' + (isToday ? ' is-today' : '') + '" data-day="' + day + '">';
      html += '<div class="day-side">' +
        '<span class="dn">' + D.DAY_NAMES[day - 1] + '</span>' +
        '<span class="dd">' + fmtLong(date) + '</span>' +
        (isToday ? '<span class="dc">bu gün</span>' : '') +
      '</div>';

      html += '<div class="pairs">';
      if (!max) {
        html += '<div class="day-off">Dərs yoxdur<span>hər iki qrup üzrə</span></div>';
      } else {
        for (var slot = 1; slot <= max; slot++) {
          var ln = D.lessonAt('nurxan', day, slot, kind);
          var ls = D.lessonAt('senuber', day, slot, kind);
          html += '<div class="pair">';
          html += '<div class="cell"><span class="cell-grp g-nur">Nurxan</span>' +
            (ln ? cardHtml(ln, 'nurxan') : emptyHtml('nurxan', day, slot, kind, nurCount === 0)) + '</div>';
          html += '<div class="cell"><span class="cell-grp g-sen">Sənubər</span>' +
            (ls ? cardHtml(ls, 'senuber') : emptyHtml('senuber', day, slot, kind, senCount === 0)) + '</div>';
          html += '</div>';
        }
      }
      html += '</div></div>';
    }

    $('#board').innerHTML = html;
    applyShownDay(todayIdx);
    markNowCard(kind, monday);
  }

  function applyShownDay(todayIdx) {
    var day = state.day;
    if (!day) {
      day = state.viewOffset === 0 && todayIdx >= 1 && todayIdx <= 5 ? todayIdx : 1;
    }
    if (day < 1 || day > 5) day = 1;
    state.day = day;
    $$('#board .day-block').forEach(function (el) {
      el.classList.toggle('is-shown', Number(el.getAttribute('data-day')) === day);
    });
    $$('#dayStrip .day-chip').forEach(function (b) {
      b.classList.toggle('is-on', Number(b.getAttribute('data-day')) === day);
    });
  }

  function renderDayStrip() {
    var monday = displayMonday();
    var today = startOfDay(new Date());
    var isThisWeek = state.viewOffset === 0;
    var todayIdx = (today.getDay() + 6) % 7 + 1;
    var html = '';
    for (var day = 1; day <= 5; day++) {
      var date = addDays(monday, day - 1);
      var isToday = isThisWeek && day === todayIdx;
      html += '<button type="button" class="day-chip' + (isToday ? ' is-today' : '') +
        '" data-day="' + day + '"><b>' + pad2(date.getDate()) + '</b>' +
        '<span>' + D.DAY_SHORT[day - 1] + '</span></button>';
    }
    $('#dayStrip').innerHTML = html;
  }

  function renderWeekHeader() {
    var monday = displayMonday();
    var kind = kindOf(monday);
    var sunday = addDays(monday, 6);
    var isThisWeek = state.viewOffset === 0;

    $('#weekTitle').textContent = kindLabel(kind);
    $('#weekRange').textContent = fmtLong(monday) + ' – ' + fmtLong(sunday);
    $('#weekDot').classList.toggle('is-alt', kind === 'alt');
    $('#weekPill').textContent = kindLabel(kind);
    $('#weekPill').classList.toggle('is-alt', kind === 'alt');

    $$('.week-switch .chip').forEach(function (b) {
      var on = b.getAttribute('data-week') === kind;
      b.classList.toggle('is-on', on);
      b.classList.toggle('is-alt', on && kind === 'alt');
    });

    $('#thisWeek').disabled = isThisWeek;
    $('#thisWeek').textContent = isThisWeek ? 'Bu həftə' : 'Bu həftəyə qayıt';

    var hint = $('#weekHint');
    hint.textContent = 'Həftələr növbə ilə dəyişir: bir həftə üst, bir həftə alt. ' +
      'Seçilmiş həftə: ' + kindLabel(kind).toLowerCase() + '.';
  }

  function markNowCard(kind, monday) {
    $$('#board .card').forEach(function (c) { c.classList.remove('is-now'); });
    var now = new Date();
    var todayIdx = (now.getDay() + 6) % 7 + 1;
    if (state.viewOffset !== 0 || todayIdx < 1 || todayIdx > 5) return;
    var hhmm = pad2(now.getHours()) + ':' + pad2(now.getMinutes());
    D.GROUP_ORDER.forEach(function (g) {
      D.lessonsFor(g, todayIdx, kind).forEach(function (l) {
        var t = D.GROUPS[g].times[l.slot];
        if (t && hhmm >= t[0] && hhmm < t[1]) {
          var idx = D.GROUP_ORDER.indexOf(g);
          var blocks = $$('#board .day-block');
          var block = blocks[todayIdx - 1];
          if (!block) return;
          var pairs = $$('.pair', block);
          var pair = pairs[l.slot - 1];
          if (!pair) return;
          var card = pair.children[idx];
          if (card && card.classList.contains('card')) card.classList.add('is-now');
        }
      });
    });
  }

  function renderNow() {
    var bar = $('#nowBar');
    var now = new Date();
    var todayIdx = (now.getDay() + 6) % 7 + 1;
    var monday = displayMonday();
    var kind = kindOf(monday);

    if (state.viewOffset !== 0 || todayIdx < 1 || todayIdx > 5) {
      bar.classList.remove('is-on');
      return;
    }

    var hhmm = pad2(now.getHours()) + ':' + pad2(now.getMinutes());
    var parts = [];

    D.GROUP_ORDER.forEach(function (g) {
      var list = D.lessonsFor(g, todayIdx, kind);
      var current = null, next = null;
      list.forEach(function (l) {
        var t = D.GROUPS[g].times[l.slot];
        if (!t) return;
        if (hhmm >= t[0] && hhmm < t[1]) current = l;
        else if (hhmm < t[0] && !next) next = l;
      });
      if (current) {
        parts.push(D.GROUPS[g].name + ': ' + D.SUBJECTS[current.subj].short +
          ' · ' + slotTime(g, current.slot) + ' · otaq ' + current.room);
      } else if (next) {
        parts.push(D.GROUPS[g].name + ': növbəti ' + D.SUBJECTS[next.subj].short +
          ' · ' + slotTime(g, next.slot));
      }
    });

    if (!parts.length) {
      bar.classList.remove('is-on');
      return;
    }

    var isLive = parts.some(function (p) { return p.indexOf('növbəti') === -1; });
    bar.innerHTML = '<span class="now-ico"><span class="pulse"></span></span><span>' +
      esc(parts.join('  ·  ')) + '</span>';
    bar.classList.toggle('is-on', true);
    bar.setAttribute('data-live', isLive ? '1' : '0');
  }

  function renderSchedule() {
    renderWeekHeader();
    renderDayStrip();
    renderBoard();
    renderNow();
  }

  /* ---------------- qayıblar ---------------- */

  function renderAbsences() {
    var list = trackedList();
    var total = 0;
    var limitSum = 0;

    var html = list.map(function (s) {
      var v = absOf(s.key);
      var limit = s.limit;
      total += v;
      limitSum += limit;
      var pct = limit ? Math.min(100, Math.round((v / limit) * 100)) : 0;
      var left = limit - v;
      var tag, tagCls;
      if (v >= limit) { tag = 'limit dolub'; tagCls = 'full'; }
      else if (left <= 2) { tag = left + ' qalıb'; tagCls = 'warn'; }
      else { tag = left + ' qalıb'; tagCls = 'ok'; }

      return '' +
        '<div class="abs-row" style="--sc:' + s.color + '" data-key="' + s.key + '">' +
          '<div class="abs-info">' +
            '<div class="abs-name">' + esc(s.name) + '</div>' +
            '<div class="abs-meta">' +
              '<span class="abs-limit">limit: ' + limit + '</span>' +
              '<span class="abs-tag ' + tagCls + '">' + tag + '</span>' +
            '</div>' +
            '<div class="abs-bar' + (v >= limit ? ' is-full' : pct >= 70 ? ' is-warn' : '') + '">' +
              '<i style="width:' + pct + '%"></i>' +
            '</div>' +
          '</div>' +
          '<div class="abs-ctrl">' +
            '<button type="button" class="step-btn" data-act="dec" aria-label="Azalt"' +
              (v <= 0 ? ' disabled' : '') + '>−</button>' +
            '<input class="abs-value' + (v >= limit ? ' is-full' : '') + '" type="number" ' +
              'inputmode="numeric" min="0" max="' + limit + '" step="1" value="' + v + '" ' +
              'aria-label="' + esc(s.name) + ' qayıb sayı">' +
            '<button type="button" class="step-btn" data-act="inc" aria-label="Artır"' +
              (v >= limit ? ' disabled' : '') + '>+</button>' +
          '</div>' +
        '</div>';
    }).join('');

    $('#absenceList').innerHTML = html;
    $('#absTotal').textContent = total;
    $('#absLimitTotal').textContent = limitSum;
    syncMeta();
  }

  function setAbsence(key, value) {
    var subj = D.SUBJECTS[key];
    if (!subj || subj.limit === null || subj.limit === undefined) return 0;
    var v = Math.round(Number(value));
    if (!isFinite(v)) v = 0;
    if (v < 0) v = 0;
    if (v > subj.limit) v = subj.limit;
    state.abs[key] = v;
    persist();
    return v;
  }

  /* Bir sətri yerində yeniləyir — siyahını təkrar qurmadan.
     Beləliklə fokus itmir və sürətli kliklərdə say düzgün artır. */
  function paintAbsRow(key) {
    var subj = D.SUBJECTS[key];
    var row = $('#absenceList .abs-row[data-key="' + key + '"]');
    if (!row || !subj || subj.limit === null) return;

    var v = absOf(key);
    var limit = subj.limit;
    var pct = limit ? Math.min(100, Math.round((v / limit) * 100)) : 0;
    var left = limit - v;

    var input = $('.abs-value', row);
    if (input) {
      if (document.activeElement !== input) input.value = String(v);
      input.max = String(limit);
      input.classList.toggle('is-full', v >= limit);
    }

    var dec = $('.step-btn[data-act="dec"]', row);
    var inc = $('.step-btn[data-act="inc"]', row);
    if (dec) dec.disabled = v <= 0;
    if (inc) inc.disabled = v >= limit;

    var bar = $('.abs-bar', row);
    if (bar) {
      bar.classList.toggle('is-full', v >= limit);
      bar.classList.toggle('is-warn', v < limit && pct >= 70);
      var fill = $('i', bar);
      if (fill) fill.style.width = pct + '%';
    }

    var tag = $('.abs-tag', row);
    if (tag) {
      tag.className = 'abs-tag ' + (v >= limit ? 'full' : left <= 2 ? 'warn' : 'ok');
      tag.textContent = v >= limit ? 'limit dolub' : left + ' qalıb';
    }

    var total = trackedList().reduce(function (n, s) { return n + absOf(s.key); }, 0);
    var totalEl = $('#absTotal');
    if (totalEl) totalEl.textContent = total;
    syncMeta();
  }

  function refreshAbsenceViews() {
    renderAbsences();
    renderStats();
    renderBoard();
  }

  /* ---------------- statistika ---------------- */

  function renderStats() {
    var list = trackedList();
    var total = 0, limitSum = 0, fullCount = 0, peak = null;

    list.forEach(function (s) {
      var v = absOf(s.key);
      total += v;
      limitSum += s.limit;
      if (v >= s.limit) fullCount++;
      var pct = s.limit ? v / s.limit : 0;
      if (!peak || pct > peak.pct) peak = { s: s, v: v, pct: pct };
    });

    var left = limitSum - total;

    $('#statCards').innerHTML = '' +
      '<div class="stat-card"><div class="sc-label">Ümumi qayıb</div>' +
        '<div class="sc-value">' + total + '</div><div class="sc-note">' + limitSum + ' limitdən</div></div>' +
      '<div class="stat-card"><div class="sc-label">Qalan</div>' +
        '<div class="sc-value">' + left + '</div><div class="sc-note">istifadə olunmamış</div></div>' +
      '<div class="stat-card"><div class="sc-label">Limit dolan fənn</div>' +
        '<div class="sc-value">' + fullCount + '</div><div class="sc-note">' + list.length + ' fənn izlənir</div></div>' +
      '<div class="stat-card"><div class="sc-label">Ən yüksək faiz</div>' +
        '<div class="sc-value">' + (total ? Math.round(peak.pct * 100) + '%' : '—') + '</div>' +
        '<div class="sc-note">' + (total ? esc(peak.s.short) : 'hələ qeyd yoxdur') + '</div></div>';

    $('#statBars').innerHTML = list.map(function (s) {
      var v = absOf(s.key);
      var pct = s.limit ? Math.min(100, Math.round((v / s.limit) * 100)) : 0;
      var color = v >= s.limit ? 'var(--danger)' : pct >= 70 ? 'var(--warn)' : s.color;
      return '' +
        '<div class="sb-row">' +
          '<div class="sb-top">' +
            '<span class="sb-name">' + esc(s.name) + '</span>' +
            '<span class="sb-num">' + v + ' / ' + s.limit + '</span>' +
          '</div>' +
          '<div class="sb-track"><i class="sb-fill" style="width:' + pct + '%;background:' + color + '"></i></div>' +
        '</div>';
    }).join('');

    $('#loadGrid').innerHTML = D.GROUP_ORDER.map(function (g) {
      var rows = ['ust', 'alt'].map(function (k) {
        var count = D.LESSONS.filter(function (l) {
          return l.g === g && (l.week === 'all' || l.week === k);
        }).length;
        return '<div class="load-line"><span>' + kindLabel(k) + '</span>' +
          '<span class="dots"></span><b>' + count + ' dərs</b></div>';
      }).join('');
      var unused = D.LESSONS.filter(function (l) { return l.g === g; }).length;
      return '' +
        '<div class="load-box' + (g === 'senuber' ? ' is-sen' : '') + '">' +
          '<h4><span class="av">' + D.GROUPS[g].name.charAt(0) + '</span>' + D.GROUPS[g].name + '</h4>' +
          '<div class="load-lines">' + rows + '</div>' +
          '<div class="load-line" style="margin-top:8px;font-size:11.5px;color:var(--ink-3)">' +
            'cəmi cədvəl sətri: ' + unused + '</div>' +
        '</div>';
    }).join('');
  }

  /* ---------------- parametrlər ---------------- */

  function renderSettings() {
    var monday = mondayOf(new Date());
    var kind = kindOf(monday);
    $('#settingsWeekNow').textContent = kindLabel(kind) + ' · ' + fmtShort(monday) + ' – ' +
      fmtShort(addDays(monday, 6));

    $$('[data-setweek]').forEach(function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-setweek') === kind);
    });
    $$('.seg-btn[data-theme]').forEach(function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-theme') === state.theme);
    });
    syncMeta();
  }

  function setWeekKind(kind) {
    var monday = mondayOf(new Date());
    var base = baseKind(monday);
    state.weekShift = base === kind ? 0 : 1;
    S.set('wk', { shift: state.weekShift, updatedAt: Date.now() });
    state.viewOffset = 0;
    state.day = null;
    renderSchedule();
    renderSettings();
    toast('Cari həftə: ' + kindLabel(kind).toLowerCase());
  }

  /* ---------------- ehtiyat nüsxə ---------------- */

  function exportData() {
    var payload = {
      app: 'cedvel-3sem',
      version: 1,
      absences: state.abs,
      weekShift: state.weekShift,
      theme: state.theme,
      savedAt: new Date().toISOString()
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'cedvel-qeydleri-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    toast('Ehtiyat nüsxə hazırdır');
  }

  function importData(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var data;
      try {
        data = JSON.parse(String(reader.result));
      } catch (e) {
        toast('Fayl oxunmadı');
        return;
      }
      if (!data || typeof data !== 'object') { toast('Fayl uyğun deyil'); return; }

      if (data.absences && typeof data.absences === 'object') {
        trackedList().forEach(function (s) {
          if (typeof data.absences[s.key] === 'number') setAbsence(s.key, data.absences[s.key]);
        });
      }
      if (typeof data.weekShift === 'number') {
        state.weekShift = data.weekShift ? 1 : 0;
        S.set('wk', { shift: state.weekShift, updatedAt: Date.now() });
      }
      if (data.theme === 'light' || data.theme === 'dark' || data.theme === 'auto') {
        state.theme = data.theme;
        applyTheme(state.theme);
        S.set('theme', { mode: state.theme, updatedAt: Date.now() });
      }
      persist();
      renderSchedule();
      renderAbsences();
      renderStats();
      renderSettings();
      toast('Qeydlər bərpa edildi');
    };
    reader.onerror = function () { toast('Fayl oxunmadı'); };
    reader.readAsText(file);
  }

  /* ---------------- bölmələr ---------------- */

  function showView(name) {
    if (VIEWS.indexOf(name) === -1) return;
    $$('.tab').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-view') === name);
      b.setAttribute('aria-selected', b.getAttribute('data-view') === name ? 'true' : 'false');
    });
    $$('.view').forEach(function (v) {
      v.classList.toggle('is-active', v.id === 'view-' + name);
    });
    if (name === 'stats') renderStats();
    if (name === 'absences') renderAbsences();
    if (name === 'settings') renderSettings();
    try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch (e) { /* köhnə brauzer */ }
  }

  /* ---------------- hadisələr ---------------- */

  function bindEvents() {
    $$('.tab').forEach(function (b) {
      b.addEventListener('click', function () { showView(b.getAttribute('data-view')); });
    });

    $('#prevWeek').addEventListener('click', function () {
      state.viewOffset -= 1;
      renderSchedule();
    });

    $('#nextWeek').addEventListener('click', function () {
      state.viewOffset += 1;
      renderSchedule();
    });

    $('#thisWeek').addEventListener('click', function () {
      state.viewOffset = 0;
      state.day = null;
      renderSchedule();
    });

    $$('.week-switch .chip').forEach(function (b) {
      b.addEventListener('click', function () {
        var want = b.getAttribute('data-week');
        var monday = displayMonday();
        if (kindOf(monday) === want) return;
        state.viewOffset += 1;
        state.day = null;
        renderSchedule();
      });
    });

    $('#dayStrip').addEventListener('click', function (e) {
      var btn = e.target.closest('.day-chip');
      if (!btn) return;
      state.day = Number(btn.getAttribute('data-day'));
      applyShownDay();
    });

    $('#absenceList').addEventListener('click', function (e) {
      var btn = e.target.closest('.step-btn');
      if (!btn) return;
      var row = btn.closest('.abs-row');
      if (!row) return;
      var key = row.getAttribute('data-key');
      var subj = D.SUBJECTS[key];
      var v = absOf(key) + (btn.getAttribute('data-act') === 'inc' ? 1 : -1);
      if (v > subj.limit) { toast('Maksimum qayıb sayı: ' + subj.limit); v = subj.limit; }
      if (v < 0) v = 0;
      setAbsence(key, v);
      paintAbsRow(key);
      renderStats();
      renderBoard();
    });

    $('#absenceList').addEventListener('input', function (e) {
      var input = e.target.closest('.abs-value');
      if (!input) return;
      var row = input.closest('.abs-row');
      if (!row) return;
      var key = row.getAttribute('data-key');
      var subj = D.SUBJECTS[key];
      var raw = input.value === '' ? 0 : Number(input.value);
      if (!isFinite(raw)) return;
      if (raw > subj.limit) {
        input.value = String(subj.limit);
        toast('Maksimum qayıb sayı: ' + subj.limit);
      } else if (raw < 0) {
        input.value = '0';
      }
      setAbsence(key, input.value === '' ? 0 : input.value);
      paintAbsRow(key);
      renderStats();
      renderBoard();
    });

    $('#absenceList').addEventListener('change', function (e) {
      var input = e.target.closest('.abs-value');
      if (!input) return;
      var row = input.closest('.abs-row');
      if (!row) return;
      var key = row.getAttribute('data-key');
      setAbsence(key, input.value === '' ? 0 : input.value);
      input.value = String(absOf(key));
      paintAbsRow(key);
      renderStats();
      renderBoard();
    });

    $('#absenceList').addEventListener('blur', function (e) {
      var input = e.target.closest && e.target.closest('.abs-value');
      if (!input) return;
      var row = input.closest('.abs-row');
      if (!row) return;
      var key = row.getAttribute('data-key');
      setAbsence(key, input.value === '' ? 0 : input.value);
      input.value = String(absOf(key));
      paintAbsRow(key);
      renderStats();
      renderBoard();
    }, true);

    $('#resetAbsences').addEventListener('click', function () {
      trackedList().forEach(function (s) { state.abs[s.key] = 0; });
      persist();
      refreshAbsenceViews();
      toast('Bütün qayıblar sıfırlandı');
    });

    $$('[data-setweek]').forEach(function (b) {
      b.addEventListener('click', function () { setWeekKind(b.getAttribute('data-setweek')); });
    });

    $$('.seg-btn[data-theme]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.theme = b.getAttribute('data-theme');
        applyTheme(state.theme);
        S.set('theme', { mode: state.theme, updatedAt: Date.now() });
        $$('.seg-btn[data-theme]').forEach(function (x) {
          x.classList.toggle('is-on', x.getAttribute('data-theme') === state.theme);
        });
      });
    });

    $('#themeToggle').addEventListener('click', function () {
      var dark = document.documentElement.getAttribute('data-theme') === 'dark';
      state.theme = dark ? 'light' : 'dark';
      applyTheme(state.theme);
      S.set('theme', { mode: state.theme, updatedAt: Date.now() });
      $$('.seg-btn[data-theme]').forEach(function (x) {
        x.classList.toggle('is-on', x.getAttribute('data-theme') === state.theme);
      });
    });

    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var onChange = function () { if (state.theme === 'auto') applyTheme('auto'); };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }

    $('#exportBtn').addEventListener('click', exportData);

    $('#importInput').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (f) importData(f);
      e.target.value = '';
    });

    document.addEventListener('keydown', function (e) {
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (!$('#view-schedule').classList.contains('is-active')) return;
      if (e.key === 'ArrowLeft') { state.viewOffset -= 1; renderSchedule(); }
      if (e.key === 'ArrowRight') { state.viewOffset += 1; renderSchedule(); }
    });

    var topbar = $('.topbar');
    var onScroll = function () {
      topbar.classList.toggle('is-stuck', window.scrollY > 6);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    window.addEventListener('online', function () {
      toast('Onlayn');
      S.flush().then(function () { syncMeta(); });
    });

    window.addEventListener('offline', function () {
      toast('Oflayn rejim — qeydlər cihazda saxlanılır');
    });

    /* Tab bağlanmadan əvvəl son vəziyyəti qeyd edirik */
    function flushState() {
      S.set('abs', { values: state.abs, updatedAt: Date.now() });
      S.set('wk', { shift: state.weekShift, updatedAt: Date.now() });
      S.set('theme', { mode: state.theme, updatedAt: Date.now() });
    }

    window.addEventListener('pagehide', flushState);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') flushState();
    });
  }

  /* ---------------- PWA ---------------- */

  function setupInstall() {
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      state.installEvent = e;
      var b1 = $('#installBtn');
      var b2 = $('#installBtn2');
      if (b1) b1.hidden = false;
      if (b2) b2.hidden = false;
      var st = $('#installState');
      if (st) st.textContent = 'Quraşdırmağa hazırdır';
    });

    function doInstall() {
      if (!state.installEvent) {
        toast('Brauzer menyusundan "Ana ekrana əlavə et" seçin');
        return;
      }
      state.installEvent.prompt();
      state.installEvent.userChoice.then(function (res) {
        if (res && res.outcome === 'accepted') toast('Tətbiq quraşdırıldı');
        state.installEvent = null;
        var b1 = $('#installBtn');
        var st = $('#installState');
        if (b1) b1.hidden = true;
        if (st) st.textContent = 'Quraşdırılıb';
      });
    }

    ['installBtn', 'installBtn2'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('click', doInstall);
    });

    window.addEventListener('appinstalled', function () {
      var b1 = $('#installBtn');
      if (b1) b1.hidden = true;
      var st = $('#installState');
      if (st) st.textContent = 'Quraşdırılıb';
      toast('Tətbiq quraşdırıldı');
    });
  }

  function setupServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      var st = $('#swState');
      if (st) st.textContent = 'Bu brauzer dəstəkləmir';
      return;
    }

    navigator.serviceWorker.register('sw.js', { scope: './' }).then(function (reg) {
      state.swReg = reg;
      var st = $('#swState');
      if (st) st.textContent = 'Aktivdir — sayt internetsiz açılır';

      reg.addEventListener('updatefound', function () {
        var nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', function () {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            var s = $('#swState');
            if (s) s.textContent = 'Yeni versiya hazırdır — "Yenilə" basın';
          }
        });
      });
    }).catch(function () {
      var st = $('#swState');
      if (st) st.textContent = 'Qeydiyyat alınmadı';
    });

    var btn = $('#updateBtn');
    if (btn) {
      btn.addEventListener('click', function () {
        if (!state.swReg) { location.reload(); return; }
        state.swReg.update().then(function () {
          if (state.swReg.waiting) {
            state.swReg.waiting.postMessage({ type: 'skip-waiting' });
            toast('Yenilənir…');
          } else {
            toast('Ən son versiya artıq aktivdir');
          }
        }).catch(function () { toast('Yeniləmə alınmadı'); });
      });
    }

    var reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (reloaded) return;
      reloaded = true;
      location.reload();
    });
  }

  /* ---------------- işə salma ---------------- */

  function boot() {
    var preferDark = prefersDark();
    document.documentElement.setAttribute('data-theme', preferDark ? 'dark' : 'light');

    S.init(['abs', 'wk', 'theme']).then(function (mem) {
      var abs = mem.abs && mem.abs.values && typeof mem.abs.values === 'object' ? mem.abs.values : {};
      trackedList().forEach(function (s) {
        var v = abs[s.key];
        state.abs[s.key] = typeof v === 'number' && isFinite(v) ? Math.min(Math.max(0, Math.round(v)), s.limit) : 0;
      });

      var wk = mem.wk;
      state.weekShift = wk && wk.shift ? 1 : 0;

      var th = mem.theme;
      state.theme = th && (th.mode === 'light' || th.mode === 'dark') ? th.mode : 'auto';
      applyTheme(state.theme);

      persist();
      bindEvents();
      renderSchedule();
      renderAbsences();
      renderStats();
      renderSettings();
      setupInstall();
      setupServiceWorker();

      if (navigator.onLine) S.flush();

      setInterval(renderNow, 30000);

      var stamp = $('#footStamp');
      if (stamp) {
        var n = new Date();
        stamp.textContent = 'son yenilənmə: ' + n.getDate() + ' ' + D.MONTHS[n.getMonth()];
      }
    }).catch(function () {
      /* Yaddaş açılmasa da cədvəl işləməlidir */
      applyTheme('auto');
      bindEvents();
      renderSchedule();
      renderAbsences();
      renderStats();
      renderSettings();
      setupInstall();
      setupServiceWorker();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
