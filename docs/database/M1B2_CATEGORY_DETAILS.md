# M1B-2 Category-Specific Current Request Details

## Product boundary

Mark's form principle is to ask for the smallest structured set of facts
that lets a carrier understand job size, operational complexity, and likely
special equipment. The form must not pretend to calculate an exact volume,
vehicle, or price from incomplete answers.

This package stores only current, mutable request details for `HOME_MOVE`,
`OFFICE_MOVE`, and `PARTIAL_ITEM`. It does not add public form binding,
pricing, assessment, purchase, payment, media, or historical snapshots.

## Physical model

Five tables were added:

- `shipment_home_move_details`: one current home-move root per shipment.
- `shipment_home_move_items`: repeatable special/large home items.
- `shipment_office_move_details`: one current office-move root per shipment.
- `shipment_partial_item_details`: the current partial-item subtype root.
- `shipment_partial_items`: repeatable structured partial-item rows.

Each root uses `shipment_id` as its primary key and stores
`service_category_code`. A composite foreign key from
`(shipment_id, service_category_code)` to
`shipments(id, service_category_code)`, plus an exact category `CHECK`,
prevents a detail row from being attached to the wrong category. Item rows
belong only to their subtype root and are deleted with that root.

The partial root intentionally has no derived totals. Quantity, fragility,
weight, and measurements remain item facts, so mutable rows cannot drift
from duplicated summary columns. The root provides category ownership and
the stable current-to-future-snapshot boundary.

## Exact code sets

Residence types:

`APARTMENT`, `DUPLEX`, `DETACHED_HOUSE`, `VILLA`, `OTHER`, `UNKNOWN`

Room layouts:

`STUDIO_1_0`, `ONE_PLUS_ONE`, `TWO_PLUS_ONE`, `THREE_PLUS_ONE`,
`FOUR_PLUS_ONE`, `FIVE_PLUS_ONE_OR_MORE`, `OTHER`, `UNKNOWN`

Household density:

`LIGHT`, `STANDARD`, `DENSE`,
`VERY_DENSE_MULTI_VEHICLE_POSSIBLE`, `UNKNOWN`

Box count bands:

`ZERO_TO_10`, `ELEVEN_TO_25`, `TWENTY_SIX_TO_50`,
`FIFTY_ONE_TO_80`, `OVER_80`, `UNKNOWN`

Home special items:

`PIANO`, `SAFE`, `LARGE_AQUARIUM`, `ANTIQUE`, `MARBLE_TABLE`,
`LARGE_BOOKCASE`, `EXERCISE_EQUIPMENT`, `LARGE_SCREEN_TV`,
`AMERICAN_STYLE_REFRIGERATOR`, `OTHER`

Office size bands:

`ZERO_TO_50_SQM`, `FIFTY_ONE_TO_100_SQM`,
`ONE_HUNDRED_ONE_TO_250_SQM`, `TWO_HUNDRED_FIFTY_ONE_TO_500_SQM`,
`OVER_500_SQM`, `UNKNOWN`

Workstation bands:

`ONE_TO_5`, `SIX_TO_15`, `SIXTEEN_TO_30`, `THIRTY_ONE_TO_60`,
`OVER_60`, `UNKNOWN`

Archive unit bands:

`ZERO`, `ONE_TO_5`, `SIX_TO_15`, `SIXTEEN_TO_30`, `OVER_30`,
`UNKNOWN`

Archive density:

`NONE`, `LIGHT`, `STANDARD`, `DENSE`, `VERY_DENSE`, `UNKNOWN`

Partial item types:

`SOFA`, `ARMCHAIR`, `BED`, `WARDROBE`, `TABLE`, `CHAIR`,
`WASHING_MACHINE`, `DISHWASHER`, `REFRIGERATOR`, `TELEVISION`,
`DESK`, `BOOKCASE`, `BOX`, `PIANO`, `SAFE`, `OTHER`

Partial size classes:

`STANDARD`, `LARGE_TWO_PERSON`, `OVERSIZED_SPECIAL_EQUIPMENT`,
`MEASUREMENTS_PROVIDED`, `UNKNOWN`

Codes use `VARCHAR`, the `ascii_bin` collation, and exact `CHECK`
constraints. MySQL or TypeORM enums were not introduced.

## V1 source review and backfill

The development database contained 2,000 shipments:

- 1,000 `HOME_MOVE`
- 300 `OFFICE_MOVE`
- 600 `PARTIAL_ITEM`
- 100 legacy `STORAGE` rows without a canonical service category

The physical `shipments` table has no room-count, room-layout, home-type,
office-size, workstation, archive, or structured shipment-item columns.
The converter volume and special-item fields were null for all 2,000 rows.
The converter catalog is reference data, not evidence of items selected for
a shipment. Existing shipment extra-service tables represent service
selection and are not category detail sources.

The `Shipment` entity declares `load_profile`, but that column is absent
from the physical database. This pre-existing entity–DB drift is documented
and intentionally not repaired in M1B-2.

Canonical `service_category_code` is reliable evidence for creating one
matching subtype root. Home residence type is mapped only from explicit
legacy place values:

- `Daire`, `Apartman Dairesi`, `Site İçi Daire` → `APARTMENT`
- `Müstakil Ev` → `DETACHED_HOUSE`
- `Villa` → `VILLA`
- every other value → `NULL`

No catch-all produces `OTHER`, `UNKNOWN`, or `STANDARD`. Room layout,
household density, box band, every office fact, and all item rows are left
null/absent because V1 has no lossless source. No `STORAGE` detail is
created and no free-text inference is performed.

The development backfill produced 1,000 home roots, 300 office roots, and
600 partial roots. Home residence distribution is 506 `APARTMENT`,
254 `DETACHED_HOUSE`, and 240 `VILLA`. Item backfill count is zero.

## Mutable seed behavior

When all five tables exist, canonical seed data creates only the subtype
matching each supported shipment:

- home shipments receive home roots and varied home details;
- office shipments receive office roots with consistent tri-state deadline
  combinations;
- partial shipments receive roots and structured item rows;
- storage shipments receive no category detail.

Seeded `OTHER` labels pass the contact, email, URL, HTML, and open-address
safety validator. Measurement rows match their size class. If none of the
five tables exists, the previous M1A/M1B-1 seed behavior is retained. A
partially applied five-table schema is rejected. Clear order is item child
before subtype root before `shipments`.

Item-level `requires_disassembly`, `requires_installation`, and
`requires_packaging` mean handling required for that particular partial
item. They do not duplicate the shipment-level canonical extra-service
selection. General packing, installation, and dismantling choices remain
in the extra-service model and are not stored on home or office roots.

## Nullable transition and API boundary

Draft category fields and unanswered booleans remain nullable. `NULL`
means unanswered or not known; it is not converted to a false or standard
answer. Office deadline and partial measurement combinations are protected
by physical checks and domain validators.

The five entities have no eager loading or uncontrolled ORM cascade. They
are not attached to the `Shipment` public serialization path. Existing
request DTOs, controllers, endpoints, and frontend files were not changed.
Production V1 create/update flows do not dual-write these tables. V2 form
commands and orchestration are a later package.

Current mutable detail is not a historical offer-round snapshot.
`ShipmentRound` and snapshot equivalents remain deferred to M1C.

## Verification

From-zero disposable verification:

- canonical migrations: 4
- legacy migrations: 0
- pending migrations: 0
- tables: 53
- shipments after seed: 2,000
- home item rows: 250
- partial item rows: 911
- category, orphan, deadline, measurement, and seed invariants: pass
- schema fingerprint:
  `869cb83954bfb684dc78f9ca5f6551a02d74437ec2ce07003d53cf7f80e4beaf`
- disposable database and isolated fixtures: removed

Seeded-upgrade disposable verification:

- shipment rows before/after: 2,000 / 2,000
- shipment primary-key fingerprint: preserved
- customer, carrier, and offer relationships: preserved
- home/office/partial roots: 1,000 / 300 / 600
- wrong-category details, orphans, and storage details: 0
- unproven office and item backfill: null/none
- legacy/pending migrations: 0 / 0
- fingerprint matches from-zero
- disposable database and isolated fixtures: removed

Development additive migration:

- environment: development, loopback, approved development database
- migration count before/after: 3 / 4
- pending after migration: 0
- shipment/customer/carrier/offer counts: preserved
- shipment primary-key fingerprint: preserved
- wrong-category details, relationship orphans, and storage details: 0
- session timezone: `+00:00`
- health endpoint: HTTP 200
- schema fingerprint:
  `869cb83954bfb684dc78f9ca5f6551a02d74437ec2ce07003d53cf7f80e4beaf`

The `down()` migration drops current category items before their roots. It
is data-destructive for any M1B-2 detail entered after deployment and must
not be used as a routine rollback. Restore or disposable database reset
requires an explicit operational decision. The verified M0B backup remains
outside the repository.

No commit or push was performed as part of this implementation.
