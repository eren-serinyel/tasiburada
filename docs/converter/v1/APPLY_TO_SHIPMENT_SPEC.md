# Converter v1 Apply-to-Shipment Spec

## Purpose

This document defines the narrow v1 scope for:

`POST /api/v1/converter/sessions/:sessionId/apply-to-shipment`

Goal:

- apply converter output to a shipment draft safely
- preserve ownership boundaries
- avoid duplicate or destructive writes
- leave a trace that shipment fields came from converter

## Scope

### In scope

- session ownership check
- shipment ownership check
- deterministic field mapping
- conservative overwrite policy
- idempotent repeat apply behavior
- basic auditability on shipment

### Out of scope

- pricing
- personnel recommendation
- route optimization
- admin approval fields
- operational planning fields
- advanced conflict resolution

## Preconditions

Apply is allowed only when all are true:

- converter session exists
- converter session belongs to current user
- converter session has persisted result
- shipment exists
- shipment belongs to current user
- shipment is still editable draft-like state

Recommended editable shipment statuses for v1:

- `pending`
- `offer_received`

Not allowed:

- `matched`
- `in_transit`
- `completed`
- `cancelled`

## Ownership Rules

### Session ownership

The caller may apply only a converter session that belongs to the same authenticated user.

### Shipment ownership

The caller may apply only to a shipment owned by the same authenticated customer.

### Cross-user restrictions

These must fail with `403`:

- applying another user's session
- applying to another user's shipment
- applying one user's session to another user's shipment

## Write Policy

### v1 default behavior

Use conservative fill-only behavior.

Rule:

- if target shipment field is empty/null, write converter value
- if target shipment field already has value, do not overwrite

### No force flag in v1

Do not add `force=true` yet.

Reason:

- keeps semantics safe
- reduces accidental destructive writes
- simplifies auditability and support

## Mapping Table

### Primary fields to write

These are the recommended v1 targets.

| Converter source | Shipment target | v1 behavior |
| --- | --- | --- |
| `recommendedVehicle` | `vehicleTypePreferenceId` or a converter hint field | write only if shipment vehicle preference is empty |
| `estimatedVolumeMin` | new shipment metadata field | write if empty |
| `estimatedVolumeMax` | new shipment metadata field | write if empty |
| `sessionId` | new shipment metadata field `converterSessionId` | always write/update to latest applied session |
| `specialItems` summary | new shipment metadata field | write if empty |

## Recommended Shipment-Level Persistence

If shipment table is not extended yet, v1 should add a small metadata footprint.

Preferred new fields on `shipments`:

- `converter_session_id` nullable
- `converter_estimated_volume_min` nullable
- `converter_estimated_volume_max` nullable
- `converter_recommended_vehicle_code` nullable
- `converter_special_items_json` nullable
- `converter_applied_at` nullable
- `converter_last_applied_by` nullable

If direct shipment columns are considered too early, fallback option:

- use a small `shipment_converter_snapshot` table keyed by `shipment_id`

But for v1, direct nullable shipment columns are the simplest path.

## Vehicle Mapping Note

If `recommendedVehicle` must map to `vehicleTypePreferenceId`, define an explicit lookup:

- `panelvan` -> matching `vehicle_types.name`
- `short_chassis_van` -> matching `vehicle_types.name`
- `long_chassis_van` -> matching `vehicle_types.name`
- `small_truck` -> matching `vehicle_types.name`
- `large_truck` -> matching `vehicle_types.name`

Do not use fuzzy matching in v1.

If lookup fails:

- keep shipment field unchanged
- still store raw converter vehicle code in converter metadata

## Idempotency Rules

Applying the same session to the same shipment more than once must be safe.

### Required behavior

- do not create duplicate rows
- do not duplicate metadata
- do not degrade existing shipment values
- update `converter_applied_at` to latest successful apply time

### Idempotency key

Natural key for v1:

- `shipment_id + converter_session_id`

### Repeat apply outcome

Second apply with same session and same shipment should return success with:

- `applied: true`
- `idempotent: true`
- `updatedFields: []` when no new fields were written

## Auditability Rules

Minimum v1 audit trace:

- shipment should know which converter session last populated it
- shipment should know when converter was applied
- response should list which fields were actually written

Recommended response fields:

- `shipmentId`
- `sessionId`
- `applied`
- `idempotent`
- `updatedFields`
- `skippedFields`
- `appliedAt`

## Endpoint Contract Draft

### Request

`POST /api/v1/converter/sessions/:sessionId/apply-to-shipment`

```json
{
  "shipmentId": "uuid"
}
```

### Success response

```json
{
  "shipmentId": "uuid",
  "sessionId": "uuid",
  "applied": true,
  "idempotent": false,
  "updatedFields": [
    "converterEstimatedVolumeMin",
    "converterEstimatedVolumeMax",
    "converterRecommendedVehicleCode",
    "converterSessionId"
  ],
  "skippedFields": [
    "vehicleTypePreferenceId"
  ],
  "appliedAt": "2026-04-22T12:00:00.000Z"
}
```

### Idempotent repeat response

```json
{
  "shipmentId": "uuid",
  "sessionId": "uuid",
  "applied": true,
  "idempotent": true,
  "updatedFields": [],
  "skippedFields": [
    "vehicleTypePreferenceId",
    "converterEstimatedVolumeMin",
    "converterEstimatedVolumeMax"
  ],
  "appliedAt": "2026-04-22T12:05:00.000Z"
}
```

## Error Conditions

### 401

- missing token
- invalid token

### 403

- session not owned by caller
- shipment not owned by caller

### 404

- session not found
- shipment not found
- result not found for session

### 409

- shipment no longer editable

## Test Scenarios

Minimum BE-04 API tests:

1. auth required
2. foreign session blocked
3. foreign shipment blocked
4. missing session returns 404
5. missing shipment returns 404
6. session without result returns 404 or 409 according to final contract
7. first apply succeeds
8. second apply is idempotent
9. existing shipment fields are preserved when overwrite is disabled
10. updatedFields and skippedFields are accurate

## Recommended Implementation Order

1. add shipment persistence fields or snapshot table
2. add service method in converter service or dedicated apply use case
3. add endpoint controller + route
4. add API flow tests
5. verify build and full test suite

## Product Language

Apply should not imply certainty.

Suggested wording in response-facing copy:

- "Converter sonucu shipment taslağına uygulandı."
- "Mevcut alanlar korunarak boş alanlar dolduruldu."
- "Nihai planlama taşıyıcı değerlendirmesiyle netleşir."
