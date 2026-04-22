# Converter API and DTO Contract v1

## Enums

### FlowType

- household

### MoveType

- household
- partial_load

### PropertyType

- studio
- 1+1
- 2+1
- 3+1
- 4+1_plus
- unknown

### Confidence

- high
- medium
- low

### RecommendedVehicle

- panelvan
- short_chassis_van
- long_chassis_van
- small_truck
- large_truck

### SessionStatus

- draft
- estimated
- applied

## Endpoint 1: Create Session

POST /api/converter/sessions

Request DTO:

```json
{
  "flowType": "household"
}
```

Validation:

- flowType required
- flowType must be household

Response 201:

```json
{
  "sessionId": "uuid",
  "status": "draft",
  "createdAt": "2026-04-22T10:00:00.000Z"
}
```

## Endpoint 2: Estimate

POST /api/converter/sessions/:sessionId/estimate

Request DTO:

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

Validation:

- moveType required, enum
- propertyType required, enum
- items required, max 200 entries
- each itemCode required and must exist in active catalog
- each quantity required, integer, min 0, max 999
- originFloor and destinationFloor required, integer, min -5, max 100
- buildingElevator required, boolean
- externalLift required, boolean
- specialItems optional, each code must exist and be special

Response 200:

```json
{
  "estimatedVolumeMin": 11,
  "estimatedVolumeMax": 15,
  "recommendedVehicle": "long_chassis_van",
  "confidence": "medium",
  "warnings": [
    "Ozel esya secildigi icin daha genis arac onerildi."
  ],
  "summaryText": "Yukunuz orta hacimli gorunuyor. Nihai arac secimi kesif sonrasi netlesebilir.",
  "manualReviewRecommended": false,
  "status": "estimated"
}
```

## Endpoint 3: Get Result

GET /api/converter/sessions/:sessionId/result

Response 200:

```json
{
  "sessionId": "uuid",
  "status": "estimated",
  "result": {
    "estimatedVolumeMin": 11,
    "estimatedVolumeMax": 15,
    "recommendedVehicle": "long_chassis_van",
    "confidence": "medium",
    "warnings": [],
    "summaryText": "Tahmini hacim bandi olustu.",
    "manualReviewRecommended": false
  }
}
```

## Endpoint 4: Apply to Shipment

POST /api/converter/sessions/:sessionId/apply-to-shipment

Request DTO:

```json
{
  "shipmentId": "uuid"
}
```

Validation:

- shipmentId required, valid uuid
- session must belong to current user scope
- session status must be estimated or applied

Response 200:

```json
{
  "shipmentId": "uuid",
  "applied": true,
  "status": "applied",
  "appliedAt": "2026-04-22T10:10:00.000Z"
}
```

## Error Contract

Common error shape:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "items[0].quantity",
        "rule": "min",
        "message": "Quantity must be >= 0"
      }
    ]
  }
}
```

Error codes:

- VALIDATION_ERROR
- SESSION_NOT_FOUND
- CATALOG_ITEM_NOT_FOUND
- RESULT_NOT_READY
- SHIPMENT_NOT_FOUND
- FORBIDDEN
