# M0B-2A Seed/Reset Envanteri

Bu envanter `canonical-v1-schema-manifest.json` içindeki 46 uygulama
tablosunu kapsar. Clear sırası `CANONICAL_CLEAR_TABLES` ile aynıdır ve
child → parent yönündedir. `migrations` uygulama tablosu değildir ve clear
işlemine dahil edilmez.

| Fiziksel tablo | Seed yazarı | Clear | FK bağımlılığı | Beklenen başlangıç durumu | Karar | Sorun |
|---|---|---:|---|---|---|---|
| admins | adminSeeder | 46 | — | boş → dolu | SEEDED_DIRECTLY | — |
| audit_logs | auditLogSeeder | 45 | — | boş → dolu | SEEDED_DIRECTLY | — |
| carrier_activity | carrierSeeder | 29 | carriers | boş → dolu | SEEDED_DIRECTLY | — |
| carrier_available_dates | carrierSeeder | 28 | carriers | boş → dolu | SEEDED_DIRECTLY | — |
| carrier_custom_extra_services | — | 27 | carriers | boş kalır | INTENTIONALLY_EMPTY | Clear listesinde yoktu; eklendi. V2 yazım akışı eklenmedi. |
| carrier_documents | carrierSeeder | 26 | admins, carriers | boş → dolu | SEEDED_DIRECTLY | — |
| carrier_earnings | carrierSeeder | 25 | carriers | boş → dolu | SEEDED_DIRECTLY | — |
| carrier_earnings_log | completedFlowSeeder | 24 | carriers | boş → dolu | SEEDED_DIRECTLY | — |
| carrier_extra_service_capabilities | carrierSeeder | 4 | carriers, extra_service_applicability, extra_services | boş → dolu | SEEDED_DIRECTLY | Scope tekilliği invariant ile doğrulanır. |
| carrier_extra_services | — | 44 | — | boş kalır | LEGACY_READ_ONLY | Entity/aktif writer yok; clear listesinde yoktu, korunan V1 tablo olarak eklendi. |
| carrier_load_type_capabilities | carrierSeeder | 23 | carriers | boş → dolu | SEEDED_DIRECTLY | — |
| carrier_notification_preferences | — | 22 | carriers | boş kalır | INTENTIONALLY_EMPTY | Runtime varsayılanı; seed writer yok. |
| carrier_profile_status | carrierSeeder | 21 | carriers | boş → dolu | SEEDED_DIRECTLY | — |
| carrier_scope_of_work | carrierSeeder | 20 | carriers, scope_of_work | boş → dolu | SEEDED_DIRECTLY | — |
| carrier_security_settings | carrierSeeder | 19 | carriers | boş → dolu | SEEDED_DIRECTLY | — |
| carrier_service_types | carrierSeeder | 18 | carriers, service_types | boş → dolu | SEEDED_DIRECTLY | — |
| carrier_stats | carrierSeeder/completedFlowSeeder | 17 | carriers | boş → dolu | SEEDED_DIRECTLY | — |
| carrier_vehicle_types | carrierSeeder | 16 | carriers, vehicle_types | boş → dolu | SEEDED_DIRECTLY | — |
| carrier_vehicles | carrierSeeder | 15 | carriers, vehicle_types | boş → dolu | SEEDED_DIRECTLY | Clear listesinde yoktu; stale `vehicles` girdisinin yerine canonical tablo eklendi. |
| carriers | carrierSeeder | 43 | — | boş → dolu | SEEDED_DIRECTLY | — |
| contact_filter_logs | runtime contact filter | 42 | — | boş kalır | RUNTIME_DERIVED | Seed writer yok. |
| converter_answers | runtime converter | 3 | converter_sessions | boş kalır | RUNTIME_DERIVED | Seed yalnız converter kataloglarını yazar. |
| converter_item_catalog | converterSeeder | 41 | — | boş → dolu | SEEDED_DIRECTLY | — |
| converter_results | runtime converter | 2 | converter_sessions | boş kalır | RUNTIME_DERIVED | Seed writer yok. |
| converter_sessions | runtime converter | 14 | shipments | boş kalır | RUNTIME_DERIVED | Seed writer yok. |
| converter_vehicle_rules | converterSeeder | 40 | — | boş → dolu | SEEDED_DIRECTLY | — |
| customer_addresses | customerSeeder | 13 | customers | boş → dolu | SEEDED_DIRECTLY | — |
| customer_carrier_relations | completedFlowSeeder | 12 | carriers, customers | boş → dolu | SEEDED_DIRECTLY | — |
| customers | customerSeeder | 39 | — | boş → dolu | SEEDED_DIRECTLY | — |
| extra_service_applicability | extraServiceSeeder | 11 | extra_services | boş → dolu | SEEDED_DIRECTLY | `(extra_service_id, load_type)` tekilliği doğrulanır. |
| extra_services | extraServiceSeeder | 38 | — | boş → dolu | SEEDED_DIRECTLY | `name` tekilliği ve katalog natural-key seti doğrulanır. |
| favorite_carriers | — | 10 | carriers, customers | boş kalır | INTENTIONALLY_EMPTY | Kullanıcı aksiyonu ile oluşur. |
| match_cooldowns | runtime matching | 37 | — | boş kalır | RUNTIME_DERIVED | Seed writer yok. |
| messages | — | 36 | — | boş kalır | INTENTIONALLY_EMPTY | Clear listesinde yoktu; canonical envantere eklendi. |
| notifications | notificationSeeder | 35 | — | boş → dolu | SEEDED_DIRECTLY | — |
| offers | offerSeeder | 9 | carriers, shipments | boş → dolu | SEEDED_DIRECTLY | Parent/orphan invariantı doğrulanır. |
| payments | completedFlowSeeder | 8 | customers, shipments | boş → dolu | SEEDED_DIRECTLY | — |
| platform_settings | settingsSeeder | 34 | — | boş → dolu | SEEDED_DIRECTLY | — |
| reviews | completedFlowSeeder | 7 | carriers, customers, shipments | boş → dolu | SEEDED_DIRECTLY | — |
| scope_of_work | lookupSeeder | 33 | — | boş → dolu | SEEDED_DIRECTLY | Natural-key seti karşılaştırılır. |
| service_types | lookupSeeder | 32 | — | boş → dolu | SEEDED_DIRECTLY | Natural-key seti karşılaştırılır. |
| shipment_custom_extra_services | — | 1 | carrier_custom_extra_services, shipments | boş kalır | INTENTIONALLY_EMPTY | Clear listesinde yoktu; V2 serbest metin seed akışı eklenmedi. |
| shipment_extra_services | shipmentSeeder relation writer | 6 | extra_services, shipments | boş → dolu | SEEDED_INDIRECTLY | Shipment ilişkisi üzerinden yazılır; orphan invariantı doğrulanır. |
| shipment_invites | — | 5 | carriers, shipments | boş kalır | INTENTIONALLY_EMPTY | Runtime davet akışı üretir. |
| shipments | shipmentSeeder | 31 | — | boş → dolu | SEEDED_DIRECTLY | — |
| vehicle_types | lookupSeeder | 30 | — | boş → dolu | SEEDED_DIRECTLY | Natural-key seti karşılaştırılır. |

## Doğrulanan drift

Önceki clear listesi 42 girdiydi. Canonical envantere göre
`carrier_extra_services`, `carrier_custom_extra_services`,
`shipment_custom_extra_services`, `carrier_vehicles` ve `messages` eksikti.
Canonical şemada bulunmayan eski `vehicles` girdisi ise fazlaydı. Beş eksik
tablo eklendi, eski girdi kaldırıldı ve 46 tablo tek listede toplandı.

## Ek hizmet sınırı

V1 katalog doğal anahtarları insan-okunur adlardır; bu aşamada stable service
code eklenmemiştir.

- `Geçici depolama` katalogda korunur ve HOME/OFFICE uygunluğuna sahiptir;
  ayrı bir `STORAGE_SERVICE` ürün kategorisi değildir.
- `Kurumsal sigorta` ve `Ek sigorta` mevcut V1 kayıtlarıdır. Faz 1 için yeni
  sigorta ürünü etkinleştirilmemiştir; stable-code adaptasyonu M1'e bırakılır.
- `Profesyonel Paketleme` ile `Ambalajlama` iki ayrı mevcut V1 adıdır.
  Ayrım bu görevde schema değişikliğiyle birleştirilmemiştir.
- `carrier_custom_extra_services` ve `shipment_custom_extra_services`
  intentionally-empty kalır; müşteri serbest metin seed akışı eklenmemiştir.
