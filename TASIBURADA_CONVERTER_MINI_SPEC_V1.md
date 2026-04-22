# Taşıburada Converter Mini Spec v1

## 1) Karar Özeti

- v1 hedefi: `hacim bandı + araç önerisi`
- v1 dışında: `fiyat tahmini yok`
- Kapsam: `ev eşyası + parça eşya`
- Kapsam dışı: `ofis taşıma` (v2)

Bu kapsam, erken yanlış fiyat beklentisi üretmeden kullanıcıya hızlı ve güvenli değer vermek için seçilmiştir.

## 2) Ürün Amacı

Kullanıcının kısa bir form ile yükünü tanımlamasını sağlayıp şu çıktıları üretmek:

- `estimatedVolumeMin`
- `estimatedVolumeMax`
- `recommendedVehicle`
- `confidence`
- `warnings[]`
- `summaryText`

## 3) v1 Kapsamı

### Dahil

- Kural bazlı hacim tahmini (min-max bandı)
- Kural bazlı araç önerisi
- Güven seviyesi (`high | medium | low`)
- Uyarı mesajları
- Sonucun shipment draft'a uygulanması
- Admin mini panel (katalog, eşikler, log, feature flag)

### Hariç

- Fiyat tahmini
- Mesafe/şehir katsayıları
- Personel önerisi
- Rota optimizasyonu
- AI/ML model
- Ofis taşıma

## 4) Araç Sınıfları (v1)

- `panelvan`
- `short_chassis_van`
- `long_chassis_van`
- `small_truck`
- `large_truck`

## 5) API Taslağı

### 5.1 Session oluştur

`POST /api/converter/sessions`

Request:

```json
{
  "flowType": "household"
}
```

Response:

```json
{
  "sessionId": "uuid",
  "status": "draft"
}
```

### 5.2 Tahmin al

`POST /api/converter/sessions/:sessionId/estimate`

Request:

```json
{
  "moveType": "household",
  "propertyType": "2+1",
  "items": [
    { "itemCode": "sofa_3_seat", "quantity": 1 },
    { "itemCode": "bed_double", "quantity": 1 },
    { "itemCode": "washing_machine", "quantity": 1 },
    { "itemCode": "box_medium", "quantity": 12 }
  ],
  "originFloor": 3,
  "destinationFloor": 2,
  "buildingElevator": true,
  "externalLift": false,
  "specialItems": ["large_tv"]
}
```

Response:

```json
{
  "estimatedVolumeMin": 11,
  "estimatedVolumeMax": 15,
  "recommendedVehicle": "long_chassis_van",
  "confidence": "medium",
  "warnings": [
    "Özel eşya seçildiği için daha geniş araç önerildi."
  ],
  "summaryText": "Yükünüz orta hacimli görünüyor. Nihai araç seçimi keşif sonrası netleşebilir."
}
```

### 5.3 Sonucu getir

`GET /api/converter/sessions/:sessionId/result`

### 5.4 Shipment draft'a uygula

`POST /api/converter/sessions/:sessionId/apply-to-shipment`

Request:

```json
{
  "shipmentId": "uuid"
}
```

Response:

```json
{
  "shipmentId": "uuid",
  "applied": true
}
```

## 6) Veri Modeli (v1)

### converter_sessions

- id
- user_id nullable
- shipment_id nullable
- flow_type
- status
- created_at
- updated_at

### converter_answers

- id
- session_id
- move_type
- property_type
- origin_floor
- destination_floor
- building_elevator
- external_lift
- special_items_json
- raw_answers_json

### converter_result_items

- id
- session_id
- item_code
- quantity
- unit_volume_min
- unit_volume_max

### converter_results

- id
- session_id
- estimated_volume_min
- estimated_volume_max
- recommended_vehicle
- confidence
- warnings_json
- summary_text
- manual_review_recommended
- applied_to_shipment_at nullable

### converter_item_catalog

- id
- item_code
- label
- category
- unit_volume_min
- unit_volume_max
- is_special
- is_active
- sort_order

### converter_vehicle_rules

- id
- vehicle_code
- label
- volume_min
- volume_max
- special_item_override
- is_active

## 7) Kural Motoru

### 7.1 Hacim hesabı

Her item için min-max hacim tanımlanır.

Örnek item hacimleri:

- 3'lü koltuk: `1.8 - 2.2`
- Çift kişilik yatak: `1.6 - 2.0`
- Çamaşır makinesi: `0.4 - 0.6`
- Orta koli: `0.08 - 0.12`

Toplam:

- `totalMin = Σ(itemMin * qty)`
- `totalMax = Σ(itemMax * qty)`

### 7.2 Araç önerisi eşikleri

- `0 - 4 m3` -> `panelvan`
- `4 - 8 m3` -> `short_chassis_van`
- `8 - 14 m3` -> `long_chassis_van`
- `14 - 22 m3` -> `small_truck`
- `22+ m3` -> `large_truck`

### 7.3 Override kuralları

- Özel eşya varsa bir üst sınıf değerlendirilebilir.
- Hacim üst sınıra çok yakınsa bir üst sınıf öner.
- Veri eksikse confidence düşür.
- Çelişkili input varsa `manual_review_recommended = true`.

### 7.4 Confidence kuralları

`high`

- property type var
- item listesi yeterince dolu
- kat + asansör bilgisi var
- çelişki yok

`medium`

- bazı alanlar eksik
- item listesi kısmen dolu

`low`

- az item girilmiş
- property type ile item listesi uyumsuz
- kritik alanlar boş

## 8) UX Akışı (v1)

- Kullanıcı 4-6 adımlı kısa form doldurur.
- Sonuç kartı: hacim bandı + araç önerisi + confidence + warning.
- `Teklife uygula` ile shipment draft'a yazılır.
- `Düzenle` ile cevaplara geri dönülür.

## 9) UI Bileşenleri

### Form

- `ConverterEntryCard`
- `MoveTypeSelector`
- `PropertyTypeSelector`
- `ItemCatalogPicker`
- `FloorSelector`
- `ElevatorSelector`
- `SpecialItemsSelector`
- `ConverterProgressBar`

### Sonuç

- `VolumeBandCard`
- `VehicleRecommendationCard`
- `ConfidenceBadge`
- `WarningList`
- `ApplyToShipmentButton`
- `EditAnswersButton`

### Shipment entegrasyonu

- `ConverterAppliedSummary`
- `PrefilledVehicleHint`
- `VolumeEstimateInfo`

## 10) Admin Mini Panel (v1)

Zorunlu:

- item catalog yönetimi
- vehicle threshold yönetimi
- sonuç log görüntüleme
- feature flag aç/kapat

Sonraya bırakılabilir:

- A/B test copy
- segment bazlı kurallar
- gelişmiş analitik dashboard

## 11) 1 Haftalık Uygulama Planı

### Gün 1 - Domain ve kurallar

- kapsam ve flow netleştirme
- araç sınıfı sabitleme
- item catalog ve katsayılar
- hacim/override/confidence kuralları

Çıktı:

- `item catalog v1`
- `vehicle thresholds v1`
- `rules doc v1`

### Gün 2 - Backend model

- tablolar, entity/model
- migration
- seed data

Çıktı:

- `schema + migration + seed`

### Gün 3 - Estimation engine

- normalize
- hacim min-max hesap
- confidence hesap
- araç önerisi
- warning üretimi

Çıktı:

- `estimateConverterResult()`
- unit testler

### Gün 4 - API

- session create
- estimate
- result get
- apply-to-shipment

Çıktı:

- controller + dto + validation
- integration test

### Gün 5 - Frontend form

- 4-6 adım form
- item picker
- kat/asansör/özel eşya
- sonuç kartı

Çıktı:

- form flow
- result summary UI

### Gün 6 - Shipment entegrasyonu

- `Teklife uygula`
- shipment draft prefill
- geri düzenleme

Çıktı:

- shipment prefill entegrasyonu

### Gün 7 - Temizlik ve ölçümleme

- event tracking
- edge case testleri
- copy polish
- feature flag
- admin mini panel son rötuş

Çıktı:

- release-ready MVP

## 12) Ürün Dili (zorunlu)

Sonuç ekranı kesin hüküm vermez.

Kullanılacak ifade çerçevesi:

- `Önerilen araç tipi`
- `Tahmini hacim bandı`
- `Nihai planlama keşif ve taşıyıcı değerlendirmesiyle netleşir.`

Bu dil kuralı v1 ve sonraki fiyat modülü için koruma sağlar.

## 13) Definition of Done (v1)

- API uçları çalışıyor ve testli.
- En az 25 temel item seed edilmiş.
- Araç eşikleri admin panelden güncellenebilir.
- Shipment apply akışı uçtan uca çalışıyor.
- Sonuç ekranında confidence + warning gösteriliyor.
- Feature flag ile kapat/aç yapılabiliyor.
- Typecheck ve testler yeşil.
