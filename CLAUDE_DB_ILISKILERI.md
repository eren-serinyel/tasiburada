# Tasiburada Veritabani Iliskileri ve Sistem Mimarisi

Bu dokuman Claude'un Tasiburada veritabani modelini ve sistemsel iliskileri hizli anlamasi icin hazirlandi. Kaynak model TypeORM entity'leridir: `src/domain/entities/*`.

## Genel Resim

Sistem bir nakliye marketplace'idir. Ana merkezde su uc domain vardir:

```text
Customer -> Shipment -> Offer -> Carrier
                 |
                 v
              Payment / Review / Notification
```

Ana fikir:

- Musteri (`customers`) tasima talebi (`shipments`) olusturur.
- Nakliyeci (`carriers`) uygun taleplere teklif (`offers`) verir.
- Musteri teklif kabul ederse shipment bir carrier ile eslesir.
- Tasima tamamlaninca odeme, kazanc, yorum ve musteri-nakliyeci iliskisi guncellenir.
- Admin, carrier onay surecini, belgeleri, ayarlari, loglari ve riskli iletisim denemelerini yonetir.

## Katman Mimarisi

```text
Frontend (shadcn-ui)
  -> apiClient / React pages
  -> Express routes/controllers
  -> Application services
  -> Repositories / AppDataSource
  -> TypeORM entities
  -> MySQL tables
```

Backend katmanlari:

- `presentation`: HTTP route/controller/middleware.
- `application`: is kurallari, transaction, notification, policy, matching.
- `infrastructure`: TypeORM DataSource, repository, migration, upload.
- `domain`: tablo/entity modeli, enum'lar, domain error'lari.

TypeORM config:

- Dosya: `src/infrastructure/database/data-source.ts`
- DB: MySQL
- `synchronize: false`
- Sema migration ile yonetilir.
- Entity glob: ts runtime icin `src/domain/entities/**/*.ts`, build icin `dist/domain/entities/**/*.js`.

## Ana Entity Gruplari

### 1. Kimlik ve Kullanici Grubu

#### customers

Musteri hesabi. Kendi adresleri, tasima talepleri, favori nakliyecileri, teklif gorunumleri ve odemeleri bu kullaniciya baglanir.

Iliskiler:

```text
Customer 1 -> N CustomerAddress
Customer 1 -> N Shipment
Customer 1 -> N FavoriteCarrier
Customer 1 -> N CustomerCarrierRelation
Customer 1 -> 1 CustomerPreference
Customer 1 -> N Payment
Customer 1 -> N Review
```

Not: `Customer` entity'sinde `shipments` relation yorum satirinda olabilir; fakat `Shipment.customerId` ve `Shipment.customer` relation'i aktif kullanilir.

#### carriers

Nakliyeci/firma hesabi. Platformdaki en genis aggregate budur. Profil, belge, arac, faaliyet, hizmet kapsami, onay durumu, kazanc ve yetkinlikler carrier etrafinda toplanir.

Iliskiler:

```text
Carrier 1 -> N CarrierVehicle
Carrier 1 -> N CarrierVehicleType
Carrier 1 -> N CarrierServiceType
Carrier 1 -> N CarrierScopeOfWork
Carrier 1 -> N CarrierDocument
Carrier 1 -> N CarrierLoadTypeCapability
Carrier 1 -> N CarrierExtraServiceCapability
Carrier 1 -> N Offer
Carrier 1 -> N ShipmentInvite
Carrier 1 -> N Review
Carrier 1 -> N FavoriteCarrier
Carrier 1 -> N CustomerCarrierRelation
Carrier 1 -> N CarrierEarningsLog

Carrier 1 -> 1 CarrierActivity
Carrier 1 -> 1 CarrierEarnings
Carrier 1 -> 1 CarrierProfileStatus
Carrier 1 -> 1 CarrierSecuritySettings
Carrier 1 -> 1 CarrierNotificationPreference
Carrier 1 -> 1 CarrierStats
```

Onemli alanlar:

- `isActive`: hesap aktif mi?
- `verifiedByAdmin`: eski/gorunur admin dogrulama bayragi.
- `approvalState`: yeni onay state machine.
- `approvalState = APPROVED` ve `verifiedByAdmin = true` public listeleme/teklif icin kritik.

Carrier onay state'leri:

```text
DRAFT -> SUBMITTED -> IN_REVIEW -> APPROVED
                         |
                         v
                      REJECTED

APPROVED -> SUSPENDED
REJECTED -> SUBMITTED (resubmission)
```

#### admins

Admin panel kullanicilari. `role` ile superadmin gibi yetkiler ayrilir. Admin auth `AdminAuthService` ve `authenticateAdmin` uzerinden yurur.

#### audit_logs

Admin ve operasyonel olay kayitlari. Admin panelde goruntulenir.

## 2. Carrier Profil, Yetkinlik ve Lookup Iliskileri

Carrier profil modeli bilincli olarak parcali tablolara ayrilmistir. Bunun nedeni onboarding ekranlarinda farkli bolumlerin ayri guncellenmesi ve profil tamamlama yuzdesinin hesaplanmasidir.

### carrier_activity

Carrier'in faaliyet sehri, hizmet alanlari, musait tarihleri gibi operasyonel bilgisini tutar.

```text
carrier_activity.carrierId -> carriers.id
onDelete: CASCADE
```

Matching ve carrier search icin onemlidir.

### carrier_profile_status

Profil tamamlama yuzdeleri ve bolum bazli durum.

```text
carrier_profile_status.carrierId -> carriers.id
onDelete: CASCADE
```

### carrier_security_settings

Carrier guvenlik ayarlari.

```text
carrier_security_settings.carrierId -> carriers.id
onDelete: CASCADE
```

### carrier_notification_preferences

Carrier bildirim tercihleri.

```text
carrier_notification_preferences.carrierId -> carriers.id
onDelete: CASCADE
```

### carrier_earnings

Carrier bakiye/kazanc aggregate'i.

```text
carrier_earnings.carrierId -> carriers.id
onDelete: CASCADE
```

### carrier_earnings_log

Tamamlanan islerden dogan kazanc logu.

```text
carrier_earnings_log.carrierId -> carriers.id
carrier_earnings_log.shipmentId -> shipments.id (kolon var, entity'de Shipment relation yok)
```

### carrier_stats

Dashboard ve performans istatistikleri.

```text
carrier_stats.carrierId -> carriers.id
```

### vehicle_types

Arac tipi lookup tablosu. Ornek: Kamyonet, Kamyon, Tir, Panel Van.

Iliskiler:

```text
VehicleType 1 -> N CarrierVehicle
VehicleType 1 -> N CarrierVehicleType
Shipment.vehicleTypePreferenceId -> VehicleType.id
```

### carrier_vehicles

Carrier'in gercek arac envanteri.

```text
carrier_vehicles.carrier_id -> carriers.id
onDelete: CASCADE

carrier_vehicles.vehicle_type_id -> vehicle_types.id
onDelete: RESTRICT
```

Kapasite, marka/model, plaka, fotograf, aktiflik gibi bilgiler buradadir.

### carrier_vehicle_types

Carrier'in destekledigi arac tiplerini tutan join/capability tablosu.

```text
carrier_vehicle_types.carrierId -> carriers.id
carrier_vehicle_types.vehicleTypeId -> vehicle_types.id
onDelete: CASCADE
```

Carrier search ve shipment matching icinde kullanilir.

### service_types ve carrier_service_types

Carrier'in destekledigi servis tipleri.

```text
carrier_service_types.carrierId -> carriers.id
carrier_service_types.serviceTypeId -> service_types.id
onDelete: CASCADE
```

### scope_of_work ve carrier_scope_of_work

Calisma kapsami lookup'i. Ornek: Sehir Ici, Sehirler Arasi.

```text
carrier_scope_of_work.carrierId -> carriers.id
carrier_scope_of_work.scopeId -> scope_of_work.id
onDelete: CASCADE
```

MatchingService shipment origin/destination sehirlerine gore gerekli scope'u hesaplar.

### extra_services

Ek hizmet katalogu. Ornek: Asansorlu Tasima, Profesyonel Paketleme.

Iliskiler:

```text
ExtraService 1 -> N ExtraServiceApplicability
ExtraService 1 -> N CarrierExtraServiceCapability
Shipment N <-> N ExtraService (shipment_extra_services)
```

### extra_service_applicability

Bir ek hizmetin hangi yuk tipi icin gecerli oldugunu belirler.

```text
extra_service_applicability.extra_service_id -> extra_services.id
onDelete: CASCADE
```

Alanlar:

- `loadType`: HOME, OFFICE, PARTIAL vb.
- `isDefaultVisible`
- `isRecommendedByConverter`
- `sortOrder`

### carrier_load_type_capabilities

Carrier'in hangi yuk tiplerini tasiyabildigini tutar.

```text
carrier_load_type_capabilities.carrier_id -> carriers.id
onDelete: CASCADE
```

Matching ve teklif verme gate'i icin kritik.

### carrier_extra_service_capabilities

Carrier'in hangi ek hizmeti hangi yuk tipi icin verebildigini tutar.

```text
carrier_extra_service_capabilities.carrier_id -> carriers.id
carrier_extra_service_capabilities.extra_service_id -> extra_services.id
onDelete: CASCADE
```

MatchingService ve OfferService bu tabloyu kullanarak "bu nakliyeci bu talebe teklif verebilir mi?" kararini verir.

## 3. Shipment, Offer, Payment, Review Akisi

### shipments

Tasima talebi ana tablosu.

FK'ler:

```text
shipments.customer_id -> customers.id
onDelete: CASCADE

shipments.carrier_id -> carriers.id
onDelete: SET NULL

shipments.origin_address_id -> customer_addresses.id
onDelete: SET NULL

shipments.destination_address_id -> customer_addresses.id
onDelete: SET NULL

shipments.vehicle_type_preference_id -> vehicle_types.id
onDelete: SET NULL

shipments N <-> N extra_services via shipment_extra_services
```

Statu akisi:

```text
PENDING -> OFFER_RECEIVED | MATCHED | CANCELLED
OFFER_RECEIVED -> MATCHED | CANCELLED
MATCHED -> IN_TRANSIT | CANCELLED
IN_TRANSIT -> COMPLETED
COMPLETED -> terminal
CANCELLED -> terminal
```

Onemli alanlar:

- `customerId`: talebi olusturan musteri.
- `carrierId`: kabul edilen/atanan nakliyeci.
- `status`: lifecycle.
- `originCity`, `originDistrict`, `destinationCity`, `destinationDistrict`.
- `shipmentCategory`: HOME_MOVE, OFFICE_MOVE, PARTIAL_ITEM, STORAGE.
- `extraServices`: istenen ek hizmetler.
- `contactPhone`: PII; carrier tarafinda kosula gore maskelenir.
- `converter*`: hacim hesaplama sonucu shipment'a uygulaninca dolar.

### offers

Carrier'in shipment'a verdigi teklif.

```text
offers.shipmentId -> shipments.id
onDelete: CASCADE

offers.carrierId -> carriers.id
onDelete: CASCADE
```

Offer status:

```text
PENDING
ACCEPTED
REJECTED
WITHDRAWN
CANCELLED
```

Kritik transaction:

```text
OfferService.acceptOffer:
  lock offer
  lock shipment
  accepted offer -> ACCEPTED
  other pending offers -> REJECTED
  shipment -> MATCHED
  shipment.carrierId = offer.carrierId
  shipment.price = offer.price
  shipment.matchedAt = now
```

### payments

Kabul edilmis teklif ve matched shipment icin manuel odeme kaydi.

```text
payments.customerId -> customers.id
payments.shipmentId -> shipments.id
payments.offerId -> offers.id (kolon var, entity relation yok)
payments.carrierId -> carriers.id (kolon var, entity relation yok)
```

Odeme su an provider olarak `manual` modelinde calisir.

Status:

```text
PENDING -> AUTHORIZED/CAPTURED -> COMPLETED
FAILED
REFUNDED
```

`PaymentService.confirmRelease` sadece shipment `COMPLETED` olduktan sonra payment'i `COMPLETED` yapar.

### reviews

Musterinin carrier/shipment icin yorum kaydi.

```text
reviews.shipmentId -> shipments.id
onDelete: CASCADE

reviews.carrierId -> carriers.id
onDelete: CASCADE

reviews.customerId -> customers.id
```

### shipment_invites

Musterinin belirli bir carrier'i shipment'a davet etmesi.

```text
shipment_invites.shipmentId -> shipments.id
onDelete: CASCADE

shipment_invites.carrierId -> carriers.id
onDelete: CASCADE
```

## 4. Musteri Yardimci Tablolari

### customer_addresses

Musteri kayitli adresleri.

```text
customer_addresses.customerId -> customers.id
onDelete: CASCADE
```

Shipment origin/destination address olarak referans verebilir.

### favorite_carriers

Musterinin favori/kayitli firmalari.

```text
favorite_carriers.customerId -> customers.id
favorite_carriers.carrierId -> carriers.id
onDelete: CASCADE
```

### customer_carrier_relations

Musteri ile carrier arasindaki gecmis is/iliski kaydi. Tasima tamamlandiginda upsert edilir.

```text
customer_carrier_relations.customerId -> customers.id
customer_carrier_relations.carrierId -> carriers.id
onDelete: CASCADE
```

### customer_preferences

Musteri teklif siralama/tercih ayarlari.

```text
customer_preferences.customer_id -> customers.id
onDelete: CASCADE
unique customer_id
```

## 5. Notification, Policy ve Guvenlik

### notifications

Bildirim tablosu. Polymorphic gibi calisir:

```text
recipientUserId + recipientRole
```

`recipientRole`: customer, carrier, admin gibi roller. Entity seviyesinde Customer/Carrier/Admin FK relation yoktur; servisler role + id ile okur/yazar.

Kullanildigi olaylar:

- Yeni teklif
- Teklif kabul/red/withdraw
- Shipment basladi/tamamlandi
- Payment released
- Admin contact safety alerts

### contact_filter_logs

Platform disi iletisim denemeleri icin guvenlik logu.

Relation olarak FK tanimli degil; polymorphic alanlar kullanir:

```text
actorType + actorId
surface
shipmentId
offerId
entityType + entityId
```

Metin saklanmaz; hash ve matched rule saklanir.

Kullanildigi yerler:

- Shipment note/load details
- Offer message
- Admin risk paneli

### match_cooldowns

Musteri-carrier eslesmesinde gecici bekleme/engelleme.

Entity'de explicit relation yoktur; kolonlar domain id olarak kullanilir:

```text
customerId
carrierId
shipmentId
status
expiresAt
```

PlatformPolicyService bu tabloyla:

- tekrar teklif/eslesme engeli
- iptal sonrasi cooldown
- admin waive

islerini yapar.

### platform_settings

Key/value platform ayarlari.

Ornek:

- `platform_commission`
- `min_commission_amount`
- `min_offer_price`

## 6. Converter / Hacim Hesaplama Iliskileri

Converter akisi shipment'tan bagimsiz baslayabilir, sonra shipment'a uygulanabilir.

### converter_sessions

Converter oturumu.

```text
converter_sessions.shipment_id -> shipments.id
onDelete: SET NULL

converter_sessions 1 -> 1 converter_answers
converter_sessions 1 -> 1 converter_results
```

`user_id` kolon olarak vardir; Customer relation yoktur. Servis user ownership'i id ile kontrol eder.

### converter_answers

Kullanici cevaplari.

```text
converter_answers.session_id -> converter_sessions.id
onDelete: CASCADE
```

### converter_results

Hesaplanan hacim/arac sonucu.

```text
converter_results.session_id -> converter_sessions.id
onDelete: CASCADE
```

### converter_item_catalog

Esya katalogu. FK yoktur; converter estimate itemCode ile bu katalogdan volume araligi okur.

### converter_vehicle_rules

Hacim bandina gore arac onerisi kural tablosu. FK yoktur; servis aktif kurallari sirayla okur.

### Converter -> Shipment uygulama

```text
ConverterService.applyToShipment:
  session owner kontrolu
  shipment owner kontrolu
  shipment status PENDING/OFFER_RECEIVED olmali
  result olmali
  bos shipment alanlari doldurulur
  dolu alanlar overwrite edilmez
  session.status = APPLIED
  session.shipmentId = shipment.id
  result.appliedToShipmentAt = now
```

Shipment'ta tutulan converter alanlari:

```text
converterSessionId
converterEstimatedVolumeMin
converterEstimatedVolumeMax
converterRecommendedVehicleCode
converterSpecialItemsJson
converterAppliedAt
converterLastAppliedBy
```

## 7. Cascade ve Silme Davranislari

Onemli cascade davranislari:

```text
Customer silinirse:
  CustomerAddress silinir
  Shipment silinir
  FavoriteCarrier silinir
  CustomerCarrierRelation silinir
  CustomerPreference silinir

Shipment silinirse:
  Offer silinir
  Review silinir
  ShipmentInvite silinir
  shipment_extra_services join kayitlari silinir
  ConverterSession.shipment_id SET NULL olur

Carrier silinirse:
  CarrierDocument silinir
  CarrierVehicle silinir
  CarrierVehicleType silinir
  CarrierServiceType silinir
  CarrierScopeOfWork silinir
  CarrierLoadTypeCapability silinir
  CarrierExtraServiceCapability silinir
  Offer silinir
  Review silinir
  ShipmentInvite silinir
  FavoriteCarrier silinir
  CustomerCarrierRelation silinir
  Shipment.carrier_id SET NULL olur

ExtraService silinirse:
  ExtraServiceApplicability silinir
  CarrierExtraServiceCapability silinir
```

## 8. Sistem Akislarinda Hangi Tablolar Birlikte Calisir?

### Musteri talep olusturur

```text
customers
  -> shipments
  -> shipment_extra_services
  -> notifications (eligible carriers)
```

Servis:

- `ShipmentService.createShipment`
- `PlatformPolicyService.enforceNoContactInfo`
- `NotificationService`

### Carrier pending talep gorur

```text
carriers
  -> carrier_activity
  -> carrier_scope_of_work -> scope_of_work
  -> carrier_load_type_capabilities
  -> carrier_extra_service_capabilities -> extra_services
  -> carrier_vehicle_types -> vehicle_types
  -> match_cooldowns
  -> shipments
```

Servis:

- `MatchingService`
- `ShipmentService.getPendingShipmentsForCarrier`
- `PlatformPolicyService`

### Carrier teklif verir

```text
carriers
  -> carrier_load_type_capabilities
  -> carrier_extra_service_capabilities
shipments
  -> shipment_extra_services
offers
notifications
contact_filter_logs
match_cooldowns
```

Servis:

- `OfferService.createOffer`
- `PlatformPolicyService.enforceNoContactInfo`
- `NotificationService`

### Musteri teklif kabul eder

```text
offers
shipments
carriers
notifications
```

Servis:

- `OfferService.acceptOffer`
- Pessimistic lock kullanir.
- Double accept race condition'a karsi transaction vardir.

### Tasima tamamlanir

```text
shipments
carriers
carrier_stats
carrier_earnings_log
customer_carrier_relations
notifications
reviews (sonradan)
payments (release)
```

Servis:

- `ShipmentService.completeShipmentByCarrier`
- `PaymentService.confirmRelease`

### Admin carrier onaylar

```text
admins
carriers
carrier_documents
carrier_profile_status
audit_logs
notifications
```

Servis:

- `CarrierApprovalService`
- `AdminService`
- `AdminController`

### Contact safety ihlali

```text
offer/shipment text input
  -> ContactSafetyService
  -> contact_filter_logs
  -> notifications (admin)
```

Servis:

- `PlatformPolicyService.enforceNoContactInfo`
- `ContactSafetyService`

## 9. Metinsel ER Diyagrami

```text
Customer
  |--< CustomerAddress
  |--< Shipment >-- Carrier
  |       |--< Offer >-- Carrier
  |       |--< Review >-- Carrier
  |       |--< Payment
  |       |--< ShipmentInvite >-- Carrier
  |       |--< ConverterSession
  |       `--< shipment_extra_services >-- ExtraService
  |
  |--< FavoriteCarrier >-- Carrier
  |--< CustomerCarrierRelation >-- Carrier
  `-- CustomerPreference

Carrier
  |-- CarrierActivity
  |-- CarrierProfileStatus
  |-- CarrierSecuritySettings
  |-- CarrierNotificationPreference
  |-- CarrierEarnings
  |-- CarrierStats
  |--< CarrierEarningsLog
  |--< CarrierDocument
  |--< CarrierVehicle >-- VehicleType
  |--< CarrierVehicleType >-- VehicleType
  |--< CarrierServiceType >-- ServiceType
  |--< CarrierScopeOfWork >-- ScopeOfWork
  |--< CarrierLoadTypeCapability
  `--< CarrierExtraServiceCapability >-- ExtraService

ExtraService
  |--< ExtraServiceApplicability
  |--< CarrierExtraServiceCapability
  `--< shipment_extra_services >-- Shipment

ConverterSession
  |-- ConverterAnswer
  `-- ConverterResult

Notification
  `-- recipientUserId + recipientRole (polymorphic)

ContactFilterLog
  `-- actorType + actorId / shipmentId / offerId (polymorphic/log)

MatchCooldown
  `-- customerId + carrierId + shipmentId (policy table)
```

## 10. Claude Icin Degisiklik Yapma Rehberi

Yeni tablo eklerken:

1. `src/domain/entities` altina entity ekle.
2. Entity export gerekiyorsa `src/domain/entities/index.ts` guncelle.
3. Migration ekle.
4. Repository gerekiyorsa `src/infrastructure/repositories` altina ekle.
5. Business rule `src/application/services` icine konur.
6. HTTP yuzeyi gerekiyorsa controller + route ekle.
7. Seed ve testleri guncelle.

Mevcut iliskiye dokunurken:

- Cascade davranisini kontrol et.
- FK kolon adlarinda mevcut naming karisiktir: bazilari `carrierId`, bazilari `carrier_id`.
- TypeORM relation varsa repository relation listelerine eklemek gerekebilir.
- PII maskelenen alanlari API response'a yanlislikla acma.
- Offer/Shipment status transition'larini servis disinda elle degistirme.
- Payment ve Offer kabul islemlerinde transaction sinirlarini bozma.
- Carrier public listing icin `isActive`, `verifiedByAdmin`, `approvalState=APPROVED` uclusunu unutma.

