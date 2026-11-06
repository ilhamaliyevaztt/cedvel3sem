# Dərs cədvəli — 3-cü semestr

Nurxan və Sənubər qruplarının dərs cədvəli, üst/alt həftə növbəsi və qayıb uçotu.
Tam statik sayt: HTML, CSS və JavaScript. Server, API və baza tələb etmir.

## Sayt nə edir

- **İki qrup yan-yana** — hər gün üçün Nurxan və Sənubər dərsləri eyni sətirdə göstərilir.
- **Üst / alt həftə** — həftə növləri avtomatik növbə ilə dəyişir; cədvəl də ona uyğun yenilənir.
  Keçmiş və gələcək həftələrə baxmaq mümkündür.
- **Qayıb uçotu** — yalnız Nurxan bölməsi üçün. Hər fənnin öz limiti var, say əl ilə
  daxil edilir və limitdən yuxarı qalxmır.
- **Statistika** — ümumi qayıb, qalan limit, fənn üzrə faizlər, həftəlik dərs yükü.
- **Oflayn iş** — service worker bütün faylları keşləyir; internet olmadan da açılır və
  qeydlər saxlanılır (IndexedDB + localStorage).
- **Quraşdırma** — telefonda və kompüterdə tətbiq kimi quraşdırıla bilər (PWA).
- **Ünvan dəyişmir** — bölmələr arasında keçid `#`, `?page=` və ya `/route` yaratmır.

## Bölmələr

| Bölmə | Nə var |
| --- | --- |
| Cədvəl | Həftə seçimi, gün-gün cüt sütun, cari dərs göstəricisi |
| Qayıblar | 6 fənn üzrə limit, `−` / `+` düymələri və əl ilə daxiletmə |
| Statistika | Rəqəmlər, limit şkalaları, həftəlik yük |
| Parametrlər | Həftə növü, tema, ehtiyat nüsxə (JSON ixrac/bərpa), PWA |

## Cədvəl məlumatları

### Nurxan

| Gün | Dərs | Fənn | Növ | Saat | Otaq |
| --- | --- | --- | --- | --- | --- |
| 1 | 1 | Sistem və tətbiqi proqram təminatı | Mühazirə | 13:50–15:25 | 310 |
| 1 | 2 | Kompüter şəbəkələri | Seminar | 15:35–17:10 | 207 |
| 1 | 3 | Kompüter arxitekturası | Seminar | 17:20–18:55 | 401 |
| 2 | 1 | Kompleks analiz | Mühazirə | 13:50–15:25 | 415 |
| 2 | 2 | Proqramlaşdırma texnologiyaları | Seminar | 15:35–17:10 | 205 |
| 2 | 3 | Kompüter şəbəkələri | Mühazirə | 17:20–18:55 | 310 |
| 3 | 1 | Sistem və tətbiqi proqram təminatı | Seminar | 13:50–15:25 | 200 |
| 3 | 2 | Kompüter arxitekturası | Mühazirə | 15:35–17:10 | 317 |
| 4 | — | dərs yoxdur | — | — | — |
| 5 | 1 | Kompleks analiz (yalnız üst həftə) | Seminar | 13:50–15:25 | 200 |
| 5 | 3 | Proqramlaşdırma texnologiyaları | Mühazirə | 17:20–18:55 | 317 |

### Sənubər (bütün otaqlar 205)

| Gün | Dərs | Fənn | Həftə | Saat |
| --- | --- | --- | --- | --- |
| 1 | — | dərs yoxdur | — | — |
| 2 | 1 | Sonlu avtomatlar | hər həftə | 12:00–13:35 |
| 2 | 2 | Sonlu avtomatlar | hər həftə | 13:45–15:20 |
| 2 | 3 | Mobil texnologiyalar / Sonlu avtomatlar | üst / alt | 15:30–17:05 |
| 3 | 1 | Paralel və paylanan hesablamalar | hər həftə | 12:00–13:35 |
| 3 | 2 | Paralel və paylanan hesablamalar / Süni intellekt | üst / alt | 13:45–15:20 |
| 3 | 3 | Süni intellekt | hər həftə | 15:30–17:05 |
| 3 | 4 | Mobil texnologiyalar | hər həftə | 17:15–18:50 |
| 4 | 2 | Mobil texnologiyalar | hər həftə | 13:45–15:20 |
| 4 | 3 | Ədədi üsullar 2 | hər həftə | 15:30–17:05 |
| 5 | 1 | Mülki müdafiə | yalnız üst | 12:00–13:35 |
| 5 | 2 | Mülki müdafiə | yalnız üst | 13:45–15:20 |
| 5 | 3 | Ədədi üsullar 2 | hər həftə | 15:30–17:05 |
| 5 | 4 | Ədədi üsullar 2 | hər həftə | 17:15–18:50 |

### Qayıb limitləri (Nurxan)

| Fənn | Limit |
| --- | --- |
| XDİAK (əlavə dərs) | 5 |
| Proqramlaşdırma texnologiyaları | 7 |
| Kompüter arxitekturası | 7 |
| Kompleks analiz | 5 |
| Kompüter şəbəkələri | 7 |
| Sistem və tətbiqi proqram təminatı | 7 |

## Həftə növbəsi

Həftə növləri `2 noyabr 2026` tarixindən hesablanır və hər həftə növbə ilə dəyişir.
Tarix `js/data.js` və `js/app.js` fayllarındaki `ANCHOR` sabiti ilə təyin olunur.
Uyğunsuzluq olarsa, **Parametrlər → Cari həftə** bölməsindən əl ilə düzəltmək mümkündür.

## Fayl strukturu

```
.
├── index.html          # Bütün bölmələrin HTML-i
├── css/style.css       # Görünüş, işıq/tünd tema, responsiv
├── js/data.js          # Dərslər, saatlar, otaqlar, limitlər
├── js/store.js         # IndexedDB + localStorage yaddaşı
├── js/app.js           # Cədvəl, qayıb, statistika məntiqi
├── sw.js               # Service worker (oflayn keş)
├── manifest.json       # PWA konfiqurasiyası
├── icons/              # Tətbiq ikonları
└── render.yaml         # Render üçün konfiqurasiya
```

## Render.com-da yerləşdirmə

1. Repozitoriyanı Render-a qoşun.
2. **New → Static Site** seçin.
3. Ayarlar:
   - **Build Command**: boş buraxın
   - **Publish Directory**: `.`
4. **Create Static Site** basın.

Sayt statik olduğu üçün əlavə konfiqurasiya tələb olunmur. HTTPS avtomatik verilir,
Custom Domain də problemsiz qoşulur.

## Yerli yoxlama

Faylları birbaşa açmaq olar, amma service worker üçün HTTP lazımdır:

```bash
python3 -m http.server 3000
```

Sonra `http://localhost:3000` ünvanını açın.

## Brauzer dəstəyi

Chrome, Edge, Firefox, Safari (iOS 15+) və Android brauzerləri.
PWA quraşdırması Chrome/Edge (masaüstü və Android) ilə tam dəstəklənir;
iOS-də "Ana ekrana əlavə et" menyusundan istifadə olunur.
