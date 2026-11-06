/* Cədvəl məlumatları — 3-cü semestr, iki qrup.
   Bütün dərslər, saatlar və otaqlar bu fayldadır. */
(function () {
  'use strict';

  var DAY_NAMES = [
    'Bazar ertəsi',
    'Çərşənbə axşamı',
    'Çərşənbə',
    'Cümə axşamı',
    'Cümə',
    'Şənbə',
    'Bazar'
  ];

  var DAY_SHORT = ['B.e.', 'Ç.a.', 'Çər.', 'C.a.', 'Cüm.', 'Şən.', 'Baz.'];

  var MONTHS = [
    'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
    'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'
  ];

  /* Hər qrupun dərs saatları (cüt dərs: 1 saat 35 dəqiqə, aralarda 10 dəqiqə fasilə) */
  var GROUPS = {
    nurxan: {
      id: 'nurxan',
      name: 'Nurxan',
      times: {
        1: ['13:50', '15:25'],
        2: ['15:35', '17:10'],
        3: ['17:20', '18:55']
      }
    },
    senuber: {
      id: 'senuber',
      name: 'Sənubər',
      times: {
        1: ['12:00', '13:35'],
        2: ['13:45', '15:20'],
        3: ['15:30', '17:05'],
        4: ['17:15', '18:50']
      }
    }
  };

  var GROUP_ORDER = ['nurxan', 'senuber'];

  /* Fənlər. limit — yalnız Nurxan üçün qayıb limitidir (null = izlənmir). */
  var SUBJECTS = {
    /* Nurxan */
    stpt:  { name: 'Sistem və tətbiqi proqram təminatı', short: 'STPT',  color: '#2f7d6f', limit: 7, group: 'nurxan', extra: false },
    ks:    { name: 'Kompüter şəbəkələri',                short: 'KŞ',    color: '#3a6ea5', limit: 7, group: 'nurxan', extra: false },
    ka:    { name: 'Kompüter arxitekturası',             short: 'KA',    color: '#8a5a2b', limit: 7, group: 'nurxan', extra: false },
    kan:   { name: 'Kompleks analiz',                    short: 'KAn',   color: '#6b4c9a', limit: 5, group: 'nurxan', extra: false },
    pt:    { name: 'Proqramlaşdırma texnologiyaları',    short: 'PT',    color: '#b0532c', limit: 7, group: 'nurxan', extra: false },
    xdiak: { name: 'XDİAK (əlavə dərs)',                 short: 'XDİAK', color: '#7a7f87', limit: 5, group: 'nurxan', extra: true },

    /* Sənubər */
    sa:    { name: 'Sonlu avtomatlar',                    short: 'SA',  color: '#4a7a5c', limit: null, group: 'senuber' },
    mt:    { name: 'Mobil texnologiyalar',                short: 'MT',  color: '#a8654a', limit: null, group: 'senuber' },
    pph:   { name: 'Paralel və paylanan hesablamalar',    short: 'PPH', color: '#3f6f8a', limit: null, group: 'senuber' },
    si:    { name: 'Süni intellekt',                      short: 'Sİ',  color: '#7a5b8a', limit: null, group: 'senuber' },
    eu2:   { name: 'Ədədi üsullar 2',                     short: 'ƏÜ2', color: '#8a7434', limit: null, group: 'senuber' },
    mm:    { name: 'Mülki müdafiə',                       short: 'MM',  color: '#6d6d6d', limit: null, group: 'senuber' }
  };

  /* week: 'all' | 'ust' (üst həftə) | 'alt' (alt həftə) */
  var LESSONS = [
    /* ---------- Nurxan ---------- */
    { g: 'nurxan', day: 1, slot: 1, subj: 'stpt', kind: 'Mühazirə', room: '310', week: 'all' },
    { g: 'nurxan', day: 1, slot: 2, subj: 'ks',   kind: 'Seminar',  room: '207', week: 'all' },
    { g: 'nurxan', day: 1, slot: 3, subj: 'ka',   kind: 'Seminar',  room: '401', week: 'all' },

    { g: 'nurxan', day: 2, slot: 1, subj: 'kan',  kind: 'Mühazirə', room: '415', week: 'all' },
    { g: 'nurxan', day: 2, slot: 2, subj: 'pt',   kind: 'Seminar',  room: '205', week: 'all' },
    { g: 'nurxan', day: 2, slot: 3, subj: 'ks',   kind: 'Mühazirə', room: '310', week: 'all' },

    { g: 'nurxan', day: 3, slot: 1, subj: 'stpt', kind: 'Seminar',  room: '200', week: 'all' },
    { g: 'nurxan', day: 3, slot: 2, subj: 'ka',   kind: 'Mühazirə', room: '317', week: 'all' },

    { g: 'nurxan', day: 5, slot: 1, subj: 'kan',  kind: 'Seminar',  room: '200', week: 'ust' },
    { g: 'nurxan', day: 5, slot: 3, subj: 'pt',   kind: 'Mühazirə', room: '317', week: 'all' },

    /* ---------- Sənubər ---------- */
    { g: 'senuber', day: 2, slot: 1, subj: 'sa',  room: '205', week: 'all' },
    { g: 'senuber', day: 2, slot: 2, subj: 'sa',  room: '205', week: 'all' },
    { g: 'senuber', day: 2, slot: 3, subj: 'mt',  room: '205', week: 'ust' },
    { g: 'senuber', day: 2, slot: 3, subj: 'sa',  room: '205', week: 'alt' },

    { g: 'senuber', day: 3, slot: 1, subj: 'pph', room: '205', week: 'all' },
    { g: 'senuber', day: 3, slot: 2, subj: 'pph', room: '205', week: 'ust' },
    { g: 'senuber', day: 3, slot: 2, subj: 'si',  room: '205', week: 'alt' },
    { g: 'senuber', day: 3, slot: 3, subj: 'si',  room: '205', week: 'all' },
    { g: 'senuber', day: 3, slot: 4, subj: 'mt',  room: '205', week: 'all' },

    { g: 'senuber', day: 4, slot: 2, subj: 'mt',  room: '205', week: 'all' },
    { g: 'senuber', day: 4, slot: 3, subj: 'eu2', room: '205', week: 'all' },

    { g: 'senuber', day: 5, slot: 1, subj: 'mm',  room: '205', week: 'ust' },
    { g: 'senuber', day: 5, slot: 2, subj: 'mm',  room: '205', week: 'ust' },
    { g: 'senuber', day: 5, slot: 3, subj: 'eu2', room: '205', week: 'all' },
    { g: 'senuber', day: 5, slot: 4, subj: 'eu2', room: '205', week: 'all' }
  ];

  /* Qayıb izlənən fənlər (yalnız Nurxan), cədvəldəki ardıcıllıqla */
  var TRACKED = ['xdiak', 'pt', 'ka', 'kan', 'ks', 'stpt'];

  function lessonsFor(groupId, day, week) {
    return LESSONS.filter(function (l) {
      return l.g === groupId && l.day === day && (l.week === 'all' || l.week === week);
    }).sort(function (a, b) { return a.slot - b.slot; });
  }

  function lessonAt(groupId, day, slot, week) {
    var list = lessonsFor(groupId, day, week);
    for (var i = 0; i < list.length; i++) {
      if (list[i].slot === slot) return list[i];
    }
    return null;
  }

  /* Verilmiş gün üçün ən böyük dərs nömrəsi (hər iki qrup üzrə) */
  function maxSlot(day, week) {
    var max = 0;
    GROUP_ORDER.forEach(function (g) {
      lessonsFor(g, day, week).forEach(function (l) {
        if (l.slot > max) max = l.slot;
      });
    });
    return max;
  }

  function toMinutes(hhmm) {
    var p = String(hhmm).split(':');
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }

  window.CEDVEL = {
    DAY_NAMES: DAY_NAMES,
    DAY_SHORT: DAY_SHORT,
    MONTHS: MONTHS,
    GROUPS: GROUPS,
    GROUP_ORDER: GROUP_ORDER,
    SUBJECTS: SUBJECTS,
    TRACKED: TRACKED,
    LESSONS: LESSONS,
    lessonsFor: lessonsFor,
    lessonAt: lessonAt,
    maxSlot: maxSlot,
    toMinutes: toMinutes
  };
})();
