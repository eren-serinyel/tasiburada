# Nakliyeciler Sayfası — Filter Analizi

---

## ⚡ Hızlı Filter Chip'leri

Sonuç alanının üstünde, yatay scroll ile gösterilecek 6 chip:

| Chip | API Param | DB Karşılığı | Kullanıcı Motivasyonu |
|------|-----------|--------------|----------------------|
| ⭐ 4+ Puan | `minRating=4` | `carrier.rating` ✅ | "Kötü deneyim yaşamak istemiyorum" |
| ✓ Onaylı Firma | `isVerified=1` | `carrier.verifiedByAdmin` ⚠️ backend ekle | "Dolandırılmak istemiyorum" |
| 🚐 Kamyonet | `vehicleTypeIds=<id>` | `carrier_vehicle_types` ✅ | En sık ihtiyaç: ev taşıma |
| 🏙️ Şehir İçi | `scopes=sehirici` | `carrier_scope_of_work` ⚠️ backend ekle | Çoğu kullanıcının ihtiyacı |
| 🛣️ Şehirler Arası | `scopes=sehirlerarasi` | `carrier_scope_of_work` ⚠️ backend ekle | İkinci büyük segment |
| 👴 5+ Yıl Deneyim | `minExperienceYears=5` | `carrier.foundedYear` ✅ | "Tecrübeli firma olsun" |

> Chip'ler toggle mantığıyla çalışır — tıkla aktif, tekrar tıkla kapat. Birden fazla chip aynı anda seçilebilir.
> **Yer:** Chip'ler sonuç sayısı bar'ının hemen altında, filter sidebar'ın sağında, yatay scroll ile.

---

## 📱 Mobil Davranış

Mevcut layout: `lg:grid-cols-[320px,1fr]` — mobilde sidebar tüm alanı kaplar. **Öneri: Bottom Sheet + Floating Button**

| Kural | Açıklama |
|-------|----------|
| Sidebar gizle | Mobilde `<Card>` içindeki sidebar default `hidden` |
| Floating Action Button | Sağ alt köşede `<Filter>` ikonu + aktif filter sayısı badge'i |
| Bottom Sheet / Drawer | FAB'a tıklayınca alttan çıkan sheet (shadcn `Drawer` component) |
| Chip'ler her zaman görünsün | Quick chip'ler mobilde de sonuç üstünde horizontal scroll ile kalır |
| "Uygula" butonu | Sheet içinde filter seçip "N sonuç göster" butonu ile kapat |
| Sonuç sayısı dinamik | Sheet açıkken filter değiştikçe buton üstündeki sayı güncellenir |

**Neden bu pattern?** Sahibinden, Trendyol, HepsiBurada hepsi kullanıyor. Türk kullanıcılar alışkın.

---

## 🔧 Backend Gereksinim Analizi

### ✅ Mevcut `GET /carriers/search` ile ÇALIŞAN filter'lar

| Filter | API Param | Repository |
|--------|-----------|------------|
| Hizmet il | `serviceCity` | `activity.city` + `JSON_SEARCH(serviceAreasJson)` |
| İlçe | `serviceDistrict` | `activity.district` + `JSON_SEARCH(serviceAreasJson)` |
| Araç tipi | `vehicleTypeIds` | `vehicleLink.vehicleTypeId IN (...)` |
| Min. puan | `minRating` | `carrier.rating >= ?` |
| Min. kapasite | `minCapacityKg` | `vehicleLink.capacityKg` veya `vehicleType.defaultCapacityKg` |
| Deneyim yılı | `minExperienceYears` | `YEAR(CURDATE()) - carrier.foundedYear >= ?` |
| Profil tamamlanma | `minProfileCompletion` | `COALESCE(profileStatus.overallPercentage, carrier.profileCompletion)` |
| Firma adı arama | `searchText` | `carrier.companyName LIKE %?%` |
| Müsait tarih | `availableDate` | `JSON_SEARCH(activity.availableDates)` |
| Sıralama | `sortBy` | rating / experience / profile / recent |

### ⚠️ Backend değişikliği GEREKEN filter'lar

| Filter | Ne Lazım | Karmaşıklık |
|--------|----------|-------------|
| `isVerified` | `WHERE carrier.verifiedByAdmin = true` ekle | **Çok Düşük** — tek satır |
| `maxCapacityKg` | Mevcut capacity bloğuna `<= :maxCapacityKg` ekle | **Çok Düşük** — tek satır |
| `hasProfilePicture` | `WHERE carrier.pictureUrl IS NOT NULL` ekle | **Çok Düşük** — tek satır |
| `scopes` | `carrier_scope_of_work` + `scope_of_work` JOIN ekle, `sow.name IN (...)` | **Düşük** — 2 tablo zaten var |
| `loadTypes` | `carrier_service_types` + `service_types` JOIN ekle | **Düşük** — scopes ile aynı pattern |
| `minReviewCount` | `reviews` tablosu subquery / HAVING clause | **Orta** |

### ❌ YAPILMAYACAK filter'lar

| Filter | Neden Hayır |
|--------|-------------|
| Fiyat aralığı | `Offer` tablosu shipment-bazlı. Carrier'ın genel fiyatı yok. Yanıltıcı olur |
| Online/çevrimiçi | WebSocket/presence sistemi yok. Sahte "online" güven kırar |
| Sigortalı araç | `vehicles.hasInsurance` vehicle-level, carrier-level değil. Yanıltıcı |

---

## 🚀 Uygulama Öncelik Sırası

### P0 — Hemen Yap (1-2 gün)

| # | İş | Açıklama |
|---|-----|----------|
| 1 | Quick Filter Chip'leri — Frontend | ⭐4+ Puan, 🚐Kamyonet, 👴5+ Yıl — sıfır backend değişikliği |
| 2 | `isVerified` backend filter | Tek satır WHERE. Güven = Türkiye'de #1 karar faktörü |
| 3 | `maxCapacityKg` backend filter | Mevcut capacity bloğuna `<=` ekleme |
| 4 | Mobil Drawer/Sheet | shadcn `Drawer` ile mevcut `CarrierFilters`'ı wrap et |

### P1 — Sonraki Sprint (3-5 gün)

| # | İş | Açıklama |
|---|-----|----------|
| 5 | `scopes` backend filter | JOIN ekle → "Şehir İçi" / "Şehirler Arası" chip'lerini aktif eder |
| 6 | `loadTypes` backend filter | "Ev Eşyası" / "Ofis Taşıma" gibi chip'ler için |
| 7 | `hasProfilePicture` backend filter | Chip değil, sıralama boost olarak kullan |

### P2 — Backlog

| # | İş | Açıklama |
|---|-----|----------|
| 8 | `minReviewCount` filter | Review sayısı az olduğunda lokal sonuç seti küçülür |
| 9 | Lokasyon-bazlı auto-suggest chip | Browser geolocation → en yakın şehri chip olarak öner |
| 10 | "Benzer nakliyeciler" | Carrier detail page'de, yeni endpoint gerektirir |

---

## Özet Karar Matrisi

```
                        Backend Değişikliği
                     YOK              VAR (Küçük)         VAR (Orta)
                ┌─────────────┬──────────────────┬─────────────────┐
  Kullanıcı     │ ⭐ 4+ Puan  │ ✓ Onaylı Firma   │ minReviewCount  │
  Etkisi        │ 🚐 Kamyonet │ maxCapacityKg    │                 │
  YÜKSEK        │ 👴 5+ Yıl   │                  │                 │
                ├─────────────┼──────────────────┼─────────────────┤
  Kullanıcı     │ Sıralama    │ 🏙️ Şehir İçi     │                 │
  Etkisi        │ (zaten var) │ 🛣️ Şehirler Arası│                 │
  ORTA          │             │ loadTypes        │                 │
                ├─────────────┼──────────────────┼─────────────────┤
  Kullanıcı     │             │ hasProfilePicture│ Sigorta (YAPMA) │
  Etkisi        │             │                  │                 │
  DÜŞÜK         │             │                  │                 │
                └─────────────┴──────────────────┴─────────────────┘
```

**Sol üst köşe = önce yap. Sağ alt köşe = yapma.**
