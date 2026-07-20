export const RESIDENCE_TYPE_CODES = [
  'APARTMENT',
  'DUPLEX',
  'DETACHED_HOUSE',
  'VILLA',
  'OTHER',
  'UNKNOWN',
] as const;

export const ROOM_LAYOUT_CODES = [
  'STUDIO_1_0',
  'ONE_PLUS_ONE',
  'TWO_PLUS_ONE',
  'THREE_PLUS_ONE',
  'FOUR_PLUS_ONE',
  'FIVE_PLUS_ONE_OR_MORE',
  'OTHER',
  'UNKNOWN',
] as const;

export const HOUSEHOLD_DENSITY_CODES = [
  'LIGHT',
  'STANDARD',
  'DENSE',
  'VERY_DENSE_MULTI_VEHICLE_POSSIBLE',
  'UNKNOWN',
] as const;

export const BOX_COUNT_BAND_CODES = [
  'ZERO_TO_10',
  'ELEVEN_TO_25',
  'TWENTY_SIX_TO_50',
  'FIFTY_ONE_TO_80',
  'OVER_80',
  'UNKNOWN',
] as const;

export const HOME_SPECIAL_ITEM_TYPE_CODES = [
  'PIANO',
  'SAFE',
  'LARGE_AQUARIUM',
  'ANTIQUE',
  'MARBLE_TABLE',
  'LARGE_BOOKCASE',
  'EXERCISE_EQUIPMENT',
  'LARGE_SCREEN_TV',
  'AMERICAN_STYLE_REFRIGERATOR',
  'OTHER',
] as const;

export const OFFICE_SIZE_BAND_CODES = [
  'ZERO_TO_50_SQM',
  'FIFTY_ONE_TO_100_SQM',
  'ONE_HUNDRED_ONE_TO_250_SQM',
  'TWO_HUNDRED_FIFTY_ONE_TO_500_SQM',
  'OVER_500_SQM',
  'UNKNOWN',
] as const;

export const WORKSTATION_COUNT_BAND_CODES = [
  'ONE_TO_5',
  'SIX_TO_15',
  'SIXTEEN_TO_30',
  'THIRTY_ONE_TO_60',
  'OVER_60',
  'UNKNOWN',
] as const;

export const ARCHIVE_UNIT_COUNT_BAND_CODES = [
  'ZERO',
  'ONE_TO_5',
  'SIX_TO_15',
  'SIXTEEN_TO_30',
  'OVER_30',
  'UNKNOWN',
] as const;

export const ARCHIVE_DENSITY_CODES = [
  'NONE',
  'LIGHT',
  'STANDARD',
  'DENSE',
  'VERY_DENSE',
  'UNKNOWN',
] as const;

export const PARTIAL_ITEM_TYPE_CODES = [
  'SOFA',
  'ARMCHAIR',
  'BED',
  'WARDROBE',
  'TABLE',
  'CHAIR',
  'WASHING_MACHINE',
  'DISHWASHER',
  'REFRIGERATOR',
  'TELEVISION',
  'DESK',
  'BOOKCASE',
  'BOX',
  'PIANO',
  'SAFE',
  'OTHER',
] as const;

export const PARTIAL_SIZE_CLASS_CODES = [
  'STANDARD',
  'LARGE_TWO_PERSON',
  'OVERSIZED_SPECIAL_EQUIPMENT',
  'MEASUREMENTS_PROVIDED',
  'UNKNOWN',
] as const;

export type ResidenceTypeCode =
  typeof RESIDENCE_TYPE_CODES[number];
export type RoomLayoutCode =
  typeof ROOM_LAYOUT_CODES[number];
export type HouseholdDensityCode =
  typeof HOUSEHOLD_DENSITY_CODES[number];
export type BoxCountBandCode =
  typeof BOX_COUNT_BAND_CODES[number];
export type HomeSpecialItemTypeCode =
  typeof HOME_SPECIAL_ITEM_TYPE_CODES[number];
export type OfficeSizeBandCode =
  typeof OFFICE_SIZE_BAND_CODES[number];
export type WorkstationCountBandCode =
  typeof WORKSTATION_COUNT_BAND_CODES[number];
export type ArchiveUnitCountBandCode =
  typeof ARCHIVE_UNIT_COUNT_BAND_CODES[number];
export type ArchiveDensityCode =
  typeof ARCHIVE_DENSITY_CODES[number];
export type PartialItemTypeCode =
  typeof PARTIAL_ITEM_TYPE_CODES[number];
export type PartialSizeClassCode =
  typeof PARTIAL_SIZE_CLASS_CODES[number];

const isCode = <T extends string>(
  codes: readonly T[],
  value: unknown,
): value is T =>
  typeof value === 'string' &&
  (codes as readonly string[]).includes(value);

export const isResidenceTypeCode = (
  value: unknown,
): value is ResidenceTypeCode =>
  isCode(RESIDENCE_TYPE_CODES, value);

export const isRoomLayoutCode = (
  value: unknown,
): value is RoomLayoutCode =>
  isCode(ROOM_LAYOUT_CODES, value);

export const isHouseholdDensityCode = (
  value: unknown,
): value is HouseholdDensityCode =>
  isCode(HOUSEHOLD_DENSITY_CODES, value);

export const isBoxCountBandCode = (
  value: unknown,
): value is BoxCountBandCode =>
  isCode(BOX_COUNT_BAND_CODES, value);

export const isHomeSpecialItemTypeCode = (
  value: unknown,
): value is HomeSpecialItemTypeCode =>
  isCode(HOME_SPECIAL_ITEM_TYPE_CODES, value);

export const isOfficeSizeBandCode = (
  value: unknown,
): value is OfficeSizeBandCode =>
  isCode(OFFICE_SIZE_BAND_CODES, value);

export const isWorkstationCountBandCode = (
  value: unknown,
): value is WorkstationCountBandCode =>
  isCode(WORKSTATION_COUNT_BAND_CODES, value);

export const isArchiveUnitCountBandCode = (
  value: unknown,
): value is ArchiveUnitCountBandCode =>
  isCode(ARCHIVE_UNIT_COUNT_BAND_CODES, value);

export const isArchiveDensityCode = (
  value: unknown,
): value is ArchiveDensityCode =>
  isCode(ARCHIVE_DENSITY_CODES, value);

export const isPartialItemTypeCode = (
  value: unknown,
): value is PartialItemTypeCode =>
  isCode(PARTIAL_ITEM_TYPE_CODES, value);

export const isPartialSizeClassCode = (
  value: unknown,
): value is PartialSizeClassCode =>
  isCode(PARTIAL_SIZE_CLASS_CODES, value);

const RESTRICTED_CUSTOM_LABEL_CONTENT =
  /(?:<[^>]*>|https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b\d(?:[\s()+.-]*\d){6,}\b|\b(?:mahalle(?:si)?|mah\.?|sokak|sok\.?|cadde|cad\.?|bulvar|apartman|kapı|daire\s*\d+|no\s*:)\b)/iu;

export const isSafeCategoryItemCustomLabel = (
  value: unknown,
): value is string => {
  if (typeof value !== 'string') return false;
  const normalized = value.trim();
  return (
    normalized.length >= 2 &&
    normalized.length <= 120 &&
    !RESTRICTED_CUSTOM_LABEL_CONTENT.test(normalized)
  );
};

export const isValidCategoryItemLabel = (
  itemTypeCode: string,
  customLabel: unknown,
): boolean => {
  if (itemTypeCode === 'OTHER') {
    return isSafeCategoryItemCustomLabel(customLabel);
  }
  return (
    customLabel === null ||
    customLabel === undefined ||
    isSafeCategoryItemCustomLabel(customLabel)
  );
};

export const isValidOfficeDeadline = (
  hasFixedCompletionDeadline: boolean | null,
  completionDeadlineAt: Date | string | null,
): boolean => {
  if (hasFixedCompletionDeadline !== true) {
    return completionDeadlineAt === null;
  }
  if (completionDeadlineAt === null) return false;
  const date = completionDeadlineAt instanceof Date
    ? completionDeadlineAt
    : new Date(completionDeadlineAt);
  return !Number.isNaN(date.getTime());
};

const isPositiveBoundedMeasurement = (
  value: number | null,
): boolean =>
  value === null ||
  (Number.isFinite(value) && value > 0 && value <= 5000);

export const isValidPartialItemMeasurements = (
  sizeClassCode: PartialSizeClassCode,
  widthCm: number | null,
  lengthCm: number | null,
  heightCm: number | null,
): boolean => {
  const values = [widthCm, lengthCm, heightCm];
  if (!values.every(isPositiveBoundedMeasurement)) return false;
  const presentCount = values.filter(value => value !== null).length;
  if (presentCount !== 0 && presentCount !== 3) return false;
  return (
    sizeClassCode !== 'MEASUREMENTS_PROVIDED' ||
    presentCount === 3
  );
};
