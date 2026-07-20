import { CanonicalBaselineV11784500000000 } from '../canonical-migrations/1784500000000-CanonicalBaselineV1';
import { AddShipmentV2IdentityCodes1784580000000 } from '../canonical-migrations/1784580000000-AddShipmentV2IdentityCodes';

export const CANONICAL_MIGRATIONS = [
  CanonicalBaselineV11784500000000,
  AddShipmentV2IdentityCodes1784580000000,
] as const;

export const CANONICAL_MIGRATION_NAME =
  'CanonicalBaselineV11784500000000';
