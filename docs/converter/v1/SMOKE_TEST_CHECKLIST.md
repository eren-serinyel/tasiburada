# Converter v1 Smoke-Test Checklist

## Quick Start

Run from repo root:

```powershell
npm run build
npm run migration:run
npm run seed
```

## Core Checklist

### A. Migration

- [ ] `npm run migration:run` completes without error
- [ ] table `converter_sessions` exists
- [ ] table `converter_answers` exists
- [ ] table `converter_results` exists
- [ ] table `converter_item_catalog` exists
- [ ] table `converter_vehicle_rules` exists

### B. Seed

- [ ] `npm run seed` completes without error
- [ ] `converter_item_catalog` contains `22` rows
- [ ] `converter_vehicle_rules` contains `5` rows
- [ ] sample item `sofa_3_seat` exists
- [ ] sample item `box_medium` exists
- [ ] sample vehicle rule `long_chassis_van` exists

### C. Repeatability

- [ ] `npm run seed:clear` completes without foreign key errors
- [ ] `npm run seed` succeeds again after clear
- [ ] counts remain stable after reseed

### D. Schema Integrity

- [ ] `converter_sessions.shipment_id` is nullable
- [ ] `converter_answers.session_id` is unique and FK-backed
- [ ] `converter_results.session_id` is unique and FK-backed
- [ ] session delete cascades to answers and results

### E. Build Confidence

- [ ] `npm run build` passes after migration + seed cycle
- [ ] no compile error introduced by converter entities/DTO/seed code

## Verification SQL

```sql
SELECT COUNT(*) AS item_count FROM converter_item_catalog;
SELECT COUNT(*) AS vehicle_rule_count FROM converter_vehicle_rules;
SELECT item_code, label FROM converter_item_catalog WHERE item_code IN ('sofa_3_seat', 'box_medium');
SELECT vehicle_code, label FROM converter_vehicle_rules WHERE vehicle_code = 'long_chassis_van';
SHOW CREATE TABLE converter_sessions;
SHOW CREATE TABLE converter_answers;
SHOW CREATE TABLE converter_results;
```

## Gate for Next Step

Only move to BE-03 estimate endpoint when every checkbox above is true.
