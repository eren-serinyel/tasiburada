# Converter Rules v1

## Scope

- Move types: household and partial load only.
- Office moves are out of v1 scope.
- Pricing is out of v1 scope.

## Inputs

Required minimum set for medium/high confidence:

- moveType
- propertyType
- items[] with quantity
- originFloor
- destinationFloor
- buildingElevator
- externalLift

Optional:

- specialItems[]

## Volume Calculation

For each item:

- itemMin = unitVolumeMin * quantity
- itemMax = unitVolumeMax * quantity

Totals:

- totalMin = sum(itemMin)
- totalMax = sum(itemMax)

Round strategy:

- estimatedVolumeMin = floor(totalMin * 10) / 10
- estimatedVolumeMax = ceil(totalMax * 10) / 10

Guardrails:

- quantity must be integer and >= 0
- unknown itemCode is validation error
- empty items[] is allowed only with low confidence and warning

## Vehicle Recommendation

Base selection uses estimatedVolumeMax against active threshold table.

Threshold bands:

- 0-4 -> panelvan
- 4-8 -> short_chassis_van
- 8-14 -> long_chassis_van
- 14-22 -> small_truck
- 22+ -> large_truck

Boundary rule:

- lower bound inclusive, upper bound exclusive
- highest band includes all above max

## Overrides

Special item escalation:

- if any special item is selected, step up by one class (if available)

Near-threshold escalation:

- if estimatedVolumeMax is >= 90% of current band upper limit, step up by one class

Conflict escalation:

- if propertyType implies high inventory but items are very sparse, keep recommendation conservative and set manual_review_recommended = true

## Confidence

High:

- propertyType present
- sufficient item coverage (>= 8 meaningful units or equivalent)
- floor and elevator data present
- no contradiction flags

Medium:

- partial item coverage
- one or two secondary fields missing
- no hard contradiction

Low:

- very sparse items
- key fields missing
- contradiction between propertyType and item set

## Warning Rules

Add warnings when:

- special item triggered escalation
- near-threshold escalation applied
- insufficient item detail
- contradictory input detected

## Summary Text Policy

Must never be definitive.

Allowed style:

- "Onerilen arac tipi"
- "Tahmini hacim bandi"
- "Nihai planlama kesif ve tasiyici degerlendirmesiyle netlesir."

## manual_review_recommended

Set true when any of these is true:

- contradiction flag exists
- confidence is low due to missing critical fields
- result required two escalation rules simultaneously

## Output Contract

Service output fields:

- estimatedVolumeMin: number
- estimatedVolumeMax: number
- recommendedVehicle: enum
- confidence: high | medium | low
- warnings: string[]
- summaryText: string
- manualReviewRecommended: boolean
