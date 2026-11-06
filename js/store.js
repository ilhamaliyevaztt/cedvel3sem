/* Yaddaş qatı — IndexedDB (əsas) + localStorage (ehtiyat).
   Qeydlər cihazda saxlanılır; internet tələb olunmur. */
(function () {
  'use strict';

  var DB_NAME = 'cedvel3sem';
  var DB_VERSION = 1;
  var STORE = 'state';
  var LS_PREFIX = 'c3s:';
  var PENDING = '__pending';

  var dbPromise = null;
  var memory = {};
  var ready = false;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!('indexedDB' in window)) { reject(new Error('yoxdur')); return; }
      var req;
      try {
        req = indexedDB.open(DB_NAME, DB_VERSION);
      } catch (e) { reject(e); return; }

      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('xəta')); };
      req.onblocked = function () { reject(new Error('bloklanıb')); };
    }).catch(function (err) {
      dbPromise = null;
      throw err;
    });
    return dbPromise;
  }

  function idbGet(key) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readonly');
        var req = tx.objectStore(STORE).get(key);
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function idbSet(key, value) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(value, key);
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { reject(tx.error); };
        tx.onabort = function () { reject(tx.error || new Error('ləğv')); };
      });
    });
  }

  function lsGet(key) {
    try {
      var raw = localStorage.getItem(LS_PREFIX + key);
      return raw === null ? undefined : JSON.parse(raw);
    } catch (e) { return undefined; }
  }

  function lsSet(key, value) {
    try {
      localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) { return false; }
  }

  function clone(value) {
    if (value === undefined) return undefined;
    try { return JSON.parse(JSON.stringify(value)); } catch (e) { return value; }
  }

  function stamp(value) {
    return value && typeof value === 'object' && typeof value.updatedAt === 'number' ? value.updatedAt : 0;
  }

  function markPending(key, on) {
    var list = lsGet(PENDING);
    if (!Array.isArray(list)) list = [];
    var i = list.indexOf(key);
    if (on && i === -1) list.push(key);
    if (!on && i !== -1) list.splice(i, 1);
    lsSet(PENDING, list);
  }

  var Store = {
    /* Açılışda hər açar üçün ən yeni nüsxəni seçir (IndexedDB ↔ localStorage). */
    init: function (keys) {
      var work = keys.map(function (key) {
        return idbGet(key).catch(function () { return undefined; }).then(function (fromDb) {
          var fromLs = lsGet(key);
          var pick;
          if (fromDb === undefined) pick = fromLs;
          else if (fromLs === undefined) pick = fromDb;
          else pick = stamp(fromLs) > stamp(fromDb) ? fromLs : fromDb;

          if (pick !== undefined) {
            memory[key] = pick;
            lsSet(key, pick);
            if (pick !== fromDb) {
              return idbSet(key, pick).catch(function () { markPending(key, true); });
            }
          }
          return null;
        });
      });

      return Promise.all(work).then(function () {
        ready = true;
        return memory;
      }).catch(function () {
        ready = false;
        keys.forEach(function (key) {
          var saved = lsGet(key);
          if (saved !== undefined) memory[key] = saved;
        });
        return memory;
      });
    },

    get: function (key, fallback) {
      return memory[key] === undefined ? fallback : clone(memory[key]);
    },

    set: function (key, value) {
      memory[key] = clone(value);
      lsSet(key, memory[key]);
      return idbSet(key, memory[key]).then(function () {
        markPending(key, false);
        return true;
      }).catch(function () {
        markPending(key, true);
        return false;
      });
    },

    /* Oflayn zamanı yazıla bilməyən açarları IndexedDB-yə köçürür. */
    flush: function () {
      var keys = lsGet(PENDING);
      if (!Array.isArray(keys) || !keys.length) return Promise.resolve(0);

      var done = [];
      return keys.reduce(function (chain, key) {
        return chain.then(function () {
          var value = lsGet(key);
          if (value === undefined) { done.push(key); return null; }
          return idbSet(key, value).then(function () {
            done.push(key);
          }).catch(function () { return null; });
        });
      }, Promise.resolve()).then(function () {
        var left = keys.filter(function (k) { return done.indexOf(k) === -1; });
        lsSet(PENDING, left);
        return done.length;
      });
    },

    isReady: function () { return ready; }
  };

  window.CedvelStore = Store;
})();
