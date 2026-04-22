# Converter API and DTO Contract v1

This document reflects implemented v1 behavior in the backend.

Base path: `/api/v1/converter`

Auth: all endpoints require `Authorization: Bearer <token>`.

## Enums

FlowType
- household

MoveType
- household
- partial_load

PropertyType
- studio
- 1+1
- 2+1
- 3+1
- 4+1_plus
- unknown

Confidence
- high
- medium
- low

RecommendedVehicle
- panelvan
- short_chassis_van
- long_chassis_van
- small_truck
- large_truck

SessionStatus
- draft
- estimated
- applied

## Response Envelope

Success:

```json
{
  "success": true,
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Error message"
}
```

## Endpoint 1: Create Session

POST `/api/v1/converter/sessions`

Request:

```json
{
  "flowType": "household"
}
```

Validation:
- `flowType` required
- `flowType` must be `household`

Response 201:

```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "status": "draft",
    "createdAt": "2026-04-22T10:00:00.000Z"
  }
}
```

## Endpoint 2: Estimate

POST `/api/v1/converter/sessions/:sessionId/estimate`

Request:

```json
{
  "moveType": "household",
  "propertyType": "2+1",
  "items": [
    { "itemCode": "sofa_3_seat", "quantity": 1 },
    { "itemCode": "bed_double", "quantity": 1 }
  ],
  "originFloor": 3,
  "destinationFloor": 2,
  "buildingElevator": true,
  "externalLift": false,
  "specialItems": ["large_tv"]
}
```

Validation:
- `moveType` enum
- `propertyType` enum
- `items` required, array, max 200
- each `itemCode` required
- each `quantity` integer in [0, 999]
- `originFloor` and `destinationFloor` integer in [-5, 100]
- `buildingElevator` boolean
- `externalLift` boolean
- `specialItems` optional array

Response 200:

```json
{
  "success": true,
  "data": {
    "estimatedVolumeMin": 11,
    "estimatedVolumeMax": 15,
    "recommendedVehicle": "long_chassis_van",
    "confidence": "medium",
    "warnings": [],
    "summaryText": "Tahmini hacim bandi 11-15 m3 araliginda gorunuyor. Nihai planlama kesif ve tasiyici degerlendirmesiyle netlesir.",
    "manualReviewRecommended": false
  }
}
```

## Endpoint 3: Get Result

GET `/api/v1/converter/sessions/:sessionId/result`

Response 200:

```json
{
  "success": true,
  "data": {
    "session": {
      "sessionId": "uuid",
      "flowType": "household",
      "status": "estimated",
      "shipmentId": null,
      "createdAt": "2026-04-22T10:00:00.000Z",
      "updatedAt": "2026-04-22T10:03:00.000Z"
    },
    "answer": {
      "moveType": "household",
      "propertyType": "2+1",
      "originFloor": 3,
      "destinationFloor": 2,
      "buildingElevator": true,
      "externalLift": false,
      "specialItems": ["large_tv"]
    },
    "result": {
      "estimatedVolumeMin": 11,
      "estimatedVolumeMax": 15,
      "recommendedVehicle": "long_chassis_van",
      "confidence": "medium",
      "warnings": [],
      "summaryText": "Tahmini hacim bandi 11-15 m3 araliginda gorunuyor. Nihai planlama kesif ve tasiyici degerlendirmesiyle netlesir.",
      "manualReviewRecommended": false,
      "status": "estimated"
    }
  }
}
```

Note: before first estimate, `answer` and `result` may be `null`.

## Endpoint 4: Apply to Shipment

POST `/api/v1/converter/sessions/:sessionId/apply-to-shipment`

Request:

```json
{
  "shipmentId": "uuid"
}
```

Validation and rules:
- `shipmentId` required, valid uuid
- session ownership enforced
- shipment ownership enforced
- shipment status must be editable (`pending` or `offer_received`)
- estimate result must exist before apply
- fill-only behavior (overwrite disabled)
- repeat apply on same session+shipment returns idempotent no-op

Response 200:

```json
{
  "success": true,
  "data": {
    "shipmentId": "uuid",
    "sessionId": "uuid",
    "applied": true,
    "idempotent": false,
    "updatedFields": ["converterSessionId", "converterAppliedAt"],
    "skippedFields": ["loadDetails"],
    "appliedAt": "2026-04-22T10:10:00.000Z"
  }
}
```

## Common Error Statuses

- 400: validation errors
- 401: missing/invalid auth token
- 403: ownership/authorization violation
- 404: session or shipment not found
- 409: business rule conflict (non-editable shipment, apply before estimate, etc.)
