# Converter v1 Migration and Seed Runbook

## Purpose

This runbook verifies that converter schema and seed scaffolding can be brought up reliably before BE-03 endpoint work starts.

Goals:

- migration runs cleanly on an empty database
- seed runs cleanly after migrations
- clear + reseed flow is repeatable
- converter reference data is actually written
- nullability and relation problems are caught early

## Preconditions

- Node.js dependencies installed at repo root
- `.env` configured for the backend database
- MySQL reachable from the app
- If using Docker, MySQL container started with [docker-compose.yml](docker-compose.yml)

## Environment Defaults

From [src/infrastructure/database/data-source.ts](src/infrastructure/database/data-source.ts):

- host: `localhost`
- port: `3306`
- username: `root`
- database: `tasiburada_dev`
- charset: `utf8mb4`

## Standard Command Set

### 1. Start MySQL if needed

```powershell
docker-compose up -d
```

### 2. Build sanity check

```powershell
npm run build
```

### 3. Run migrations on empty DB

```powershell
npm run migration:run
```

### 4. Seed baseline data

```powershell
npm run seed
```

### 5. Clear all data

```powershell
npm run seed:clear
```

### 6. Re-run migrations and seed

```powershell
npm run migration:run
npm run seed
```

### 7. Final build check

```powershell
npm run build
```

## Converter Smoke-Test Queries

Use one of the two options below.

### Option A: MySQL CLI inside Docker

```powershell
docker exec -it tasiburada-mysql mysql -uroot -p$env:DB_PASSWORD $env:DB_NAME -e "SELECT COUNT(*) AS item_count FROM converter_item_catalog;"
docker exec -it tasiburada-mysql mysql -uroot -p$env:DB_PASSWORD $env:DB_NAME -e "SELECT COUNT(*) AS vehicle_rule_count FROM converter_vehicle_rules;"
docker exec -it tasiburada-mysql mysql -uroot -p$env:DB_PASSWORD $env:DB_NAME -e "SELECT item_code, label, unit_volume_min, unit_volume_max FROM converter_item_catalog ORDER BY sort_order LIMIT 5;"
docker exec -it tasiburada-mysql mysql -uroot -p$env:DB_PASSWORD $env:DB_NAME -e "SELECT vehicle_code, volume_min, volume_max, priority FROM converter_vehicle_rules ORDER BY priority;"
```

If your shell does not expose `DB_PASSWORD` and `DB_NAME`, replace them with explicit values.

### Option B: SQL snippets for any MySQL client

```sql
SELECT COUNT(*) AS item_count FROM converter_item_catalog;
SELECT COUNT(*) AS vehicle_rule_count FROM converter_vehicle_rules;
SELECT item_code, label, unit_volume_min, unit_volume_max
FROM converter_item_catalog
ORDER BY sort_order
LIMIT 5;
SELECT vehicle_code, volume_min, volume_max, priority
FROM converter_vehicle_rules
ORDER BY priority;
```

## Expected Results

After `npm run seed`:

- `converter_item_catalog` row count should be `22`
- `converter_vehicle_rules` row count should be `5`
- first item codes should include `sofa_3_seat`, `sofa_2_seat`, `armchair`
- vehicle order should be:
  - `panelvan`
  - `short_chassis_van`
  - `long_chassis_van`
  - `small_truck`
  - `large_truck`

## Nullability and Relation Checks

Verify these conditions explicitly:

- `converter_sessions.shipment_id` accepts null
- `converter_answers.session_id` requires an existing session
- `converter_results.session_id` requires an existing session
- deleting a converter session cascades to answers/results
- deleting a shipment sets related `converter_sessions.shipment_id` to null

Suggested SQL checks:

```sql
SHOW CREATE TABLE converter_sessions;
SHOW CREATE TABLE converter_answers;
SHOW CREATE TABLE converter_results;
```

## Repeatability Checklist

Run these checks in order:

1. empty DB migration succeeds
2. initial seed succeeds
3. converter tables contain expected row counts
4. `npm run seed:clear` succeeds without foreign key errors
5. second `npm run seed` succeeds
6. second build succeeds
7. no converter seed duplicates appear

## Failure Triage

### Migration fails

Check:

- DB credentials in `.env`
- MySQL running
- migration timestamp file name loaded by TypeORM
- no per-migration transaction override conflict

### Seed fails

Check:

- converter tables created by migration
- entity names match table names
- unique item_code or vehicle_code mismatch
- clear order in [src/database/seed/clearDatabase.ts](src/database/seed/clearDatabase.ts)

### Counts are wrong

Check:

- [src/database/seed/data/converterData.ts](src/database/seed/data/converterData.ts)
- [src/database/seed/seeders/converterSeeder.ts](src/database/seed/seeders/converterSeeder.ts)
- active DB selected in `.env`

## Sign-off Rule Before BE-03

Do not start estimate endpoint work until all of these are true:

- migrations pass
- seed passes twice
- clear + reseed passes
- counts match expected values
- build passes after migration/seed cycle
