# Tasiburada Converter v1 Task Breakdown

## Scope Lock

- v1 includes: household + partial load, volume band estimation, vehicle recommendation, confidence, warnings, apply-to-shipment.
- v1 excludes: pricing, office moves, route optimization, city/distance coefficients, ML.

## Backend Tasks

### BE-01 Session Lifecycle API
- Goal: Create and manage converter sessions.
- Scope: POST /api/converter/sessions, GET /api/converter/sessions/:sessionId/result basic lookup.
- Dependencies: DB tables converter_sessions, auth middleware.
- Acceptance Criteria:
  - Session is created with status draft.
  - Unauthorized users cannot access another user's session.
  - GET result returns 404 when session/result does not exist.
- Estimated Output Files:
  - src/application/dto/converter/*.ts
  - src/application/services/converter/*.ts
  - src/presentation/controllers/ConverterController.ts
  - src/presentation/routes/converterRoutes.ts

### BE-02 Estimate Engine Service
- Goal: Compute min-max volume band and recommended vehicle.
- Scope: estimateConverterResult() with confidence and warnings.
- Dependencies: converter_item_catalog, converter_vehicle_rules, converter-rules-v1.
- Acceptance Criteria:
  - Returns estimatedVolumeMin, estimatedVolumeMax, recommendedVehicle, confidence, warnings.
  - Handles special items override and near-threshold escalation.
  - Sets manual_review_recommended on contradictory input.
- Estimated Output Files:
  - src/domain/services/converter/estimateConverterResult.ts
  - src/domain/valueObjects/converter/*.ts
  - src/domain/errors/converter/*.ts

### BE-03 Estimate Endpoint + Validation
- Goal: Expose estimate engine via API contract.
- Scope: POST /api/converter/sessions/:sessionId/estimate.
- Dependencies: BE-01, BE-02, DTO contract.
- Acceptance Criteria:
  - Validation rejects unknown itemCode, negative quantity, invalid enum values.
  - Successful requests persist answers and results.
  - Response matches api-contract-v1 exactly.
- Estimated Output Files:
  - src/application/dto/converter/EstimateConverterRequest.ts
  - src/presentation/middleware/validateConverterRequest.ts
  - src/application/services/converter/EstimateConverterUseCase.ts

### BE-04 Apply to Shipment
- Goal: Apply converter output to shipment draft.
- Scope: POST /api/converter/sessions/:sessionId/apply-to-shipment.
- Dependencies: BE-01, shipment service/repository.
- Acceptance Criteria:
  - Updates shipment draft vehicle hint + volume estimate fields.
  - Sets converter_results.applied_to_shipment_at.
  - Idempotent behavior on repeated apply.
- Estimated Output Files:
  - src/application/services/converter/ApplyConverterToShipmentUseCase.ts
  - src/infrastructure/repositories/*Shipment*.ts

### BE-05 Persistence + Seeds
- Goal: Add converter schema and baseline data.
- Scope: migrations, seeds for item catalog + vehicle thresholds.
- Dependencies: item-catalog-v1.json, vehicle-thresholds-v1.json.
- Acceptance Criteria:
  - Migration up/down verified.
  - Seed inserts active catalog and active thresholds.
  - Unique constraints prevent duplicate item_code and vehicle_code versions.
- Estimated Output Files:
  - src/database/migrations/*converter*.ts
  - src/database/seed/converter/*.ts

## Frontend Tasks

### FE-01 Converter Entry and Flow Shell
- Goal: Provide a 4-6 step wizard shell.
- Scope: page routing, progress bar, step navigation, draft persistence.
- Dependencies: BE-01 session create API.
- Acceptance Criteria:
  - User can start converter flow and continue between steps.
  - Step transitions blocked when required fields are missing.
- Estimated Output Files:
  - shadcn-ui/src/pages/Converter.tsx
  - shadcn-ui/src/components/converter/ConverterProgressBar.tsx
  - shadcn-ui/src/hooks/useConverterSession.ts

### FE-02 Item Capture Experience
- Goal: Collect item quantities and special items.
- Scope: property type, item picker, floor/elevator/special items selectors.
- Dependencies: FE-01, item catalog endpoint or static bootstrap.
- Acceptance Criteria:
  - Quantity controls prevent negative values.
  - Special item flags are explicit and editable.
  - Form state serializes to estimate request payload.
- Estimated Output Files:
  - shadcn-ui/src/components/converter/ItemCatalogPicker.tsx
  - shadcn-ui/src/components/converter/FloorSelector.tsx
  - shadcn-ui/src/components/converter/SpecialItemsSelector.tsx

### FE-03 Result Summary Card
- Goal: Show estimation output with clear uncertainty language.
- Scope: volume band card, vehicle recommendation, confidence badge, warnings.
- Dependencies: BE-03 estimate API.
- Acceptance Criteria:
  - Displays estimatedVolumeMin/max and recommendedVehicle.
  - Shows confidence and warnings when present.
  - Includes mandatory disclaimer copy.
- Estimated Output Files:
  - shadcn-ui/src/components/converter/VolumeBandCard.tsx
  - shadcn-ui/src/components/converter/VehicleRecommendationCard.tsx
  - shadcn-ui/src/components/converter/WarningList.tsx

### FE-04 Apply-to-Shipment Integration
- Goal: Push converter result into shipment draft UX.
- Scope: apply action, success state, editable return path.
- Dependencies: BE-04 endpoint, shipment draft UI.
- Acceptance Criteria:
  - Apply action updates shipment draft summary fields.
  - User can return to converter and re-apply.
  - UI handles API failure with recoverable message.
- Estimated Output Files:
  - shadcn-ui/src/components/converter/ApplyToShipmentButton.tsx
  - shadcn-ui/src/components/shipment/ConverterAppliedSummary.tsx

## Admin Tasks

### AD-01 Item Catalog Management
- Goal: Allow admin to manage converter catalog entries.
- Scope: list/create/update activate-deactivate item codes and min/max ranges.
- Dependencies: BE-05 schema and API.
- Acceptance Criteria:
  - Admin can add/edit/deactivate items.
  - Changes are audit logged.
- Estimated Output Files:
  - shadcn-ui/src/pages/admin/ConverterCatalogAdmin.tsx
  - src/presentation/controllers/admin/ConverterCatalogAdminController.ts

### AD-02 Vehicle Threshold Management
- Goal: Manage threshold ranges and override behavior.
- Scope: CRUD-lite for active vehicle rules.
- Dependencies: BE-05 schema and API.
- Acceptance Criteria:
  - Threshold ranges are non-overlapping and validated.
  - Active rule set can be toggled.
- Estimated Output Files:
  - shadcn-ui/src/pages/admin/ConverterVehicleRulesAdmin.tsx
  - src/application/services/admin/UpdateConverterVehicleRulesUseCase.ts

### AD-03 Feature Flag and Logs
- Goal: Safe rollout and observability.
- Scope: flag toggle + result log viewer.
- Dependencies: event tracking pipeline, converter results persistence.
- Acceptance Criteria:
  - Converter can be disabled by flag without deploy.
  - Admin can filter result logs by date/confidence/manual_review.
- Estimated Output Files:
  - shadcn-ui/src/pages/admin/ConverterFeatureFlagAdmin.tsx
  - shadcn-ui/src/pages/admin/ConverterResultLogs.tsx

## Test Tasks

### TE-01 Unit Tests for Estimation Rules
- Goal: Guarantee deterministic rule behavior.
- Scope: item aggregation, threshold mapping, override escalation, confidence scoring.
- Dependencies: BE-02.
- Acceptance Criteria:
  - Min 20 rule-focused test cases.
  - Boundary values covered at each threshold edge.
- Estimated Output Files:
  - src/__tests__/converter/estimateConverterResult.test.ts

### TE-02 API Integration Tests
- Goal: Lock request/response contracts.
- Scope: create session, estimate, get result, apply-to-shipment.
- Dependencies: BE-01..BE-04.
- Acceptance Criteria:
  - Contract snapshots for all success and key error cases.
  - Validation errors include actionable field messages.
- Estimated Output Files:
  - src/__tests__/converter/converter-api-flow.test.ts

### TE-03 Frontend Flow Tests
- Goal: Verify step flow and result application UX.
- Scope: wizard steps, estimate call, apply action, retry states.
- Dependencies: FE-01..FE-04.
- Acceptance Criteria:
  - Happy path and at least 5 edge paths covered.
  - Mandatory disclaimer copy always visible on result step.
- Estimated Output Files:
  - shadcn-ui/src/__tests__/converter/ConverterFlow.test.tsx

## Day-1 Ready Artifacts Required Before Coding

- docs/converter/v1/item-catalog-v1.json
- docs/converter/v1/vehicle-thresholds-v1.json
- docs/converter/v1/converter-rules-v1.md
- docs/converter/v1/api-contract-v1.md

## Sequencing

1. BE-05 and Day-1 artifacts
2. BE-01 + FE-01 parallel
3. BE-02 + TE-01
4. BE-03 + FE-02 + FE-03 + TE-02
5. BE-04 + FE-04 + TE-03
6. AD-01..AD-03 and rollout checks
