export type ProfileCompletionStepKey =
  | 'company_info'
  | 'tax_document'
  | 'k3_document'
  | 'vehicle_photos'
  | 'admin_approval';

export interface ProfileCompletionStep {
  key: ProfileCompletionStepKey;
  label: string;
  completed: boolean;
}

export interface ProfileCompletionSummary {
  percentage: number;
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
  statusText: string;
  missingItems: ProfileCompletionStepKey[];
  nextIncompleteStep?: ProfileCompletionStepKey;
  steps: ProfileCompletionStep[];
}

export type CarrierCompletionCarrier = {
  companyName?: string | null;
  phone?: string | null;
  activityCity?: string | null;
  city?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  address?: string | null;
  taxNumber?: string | null;
  verifiedByAdmin?: boolean | null;
  pendingApproval?: boolean | null;
};

export type CarrierCompletionActivity = {
  city?: string | null;
  address?: string | null;
};

export type CarrierCompletionDocument = {
  type?: string | null;
  fileUrl?: string | null;
};

export type CarrierCompletionVehicle = {
  isActive?: boolean | null;
  photos?: string[] | null;
  photoUrls?: string[] | null;
};

export interface BuildCarrierProfileCompletionInput {
  carrier?: CarrierCompletionCarrier | null;
  activity?: CarrierCompletionActivity | null;
  documents?: CarrierCompletionDocument[] | null;
  vehicles?: CarrierCompletionVehicle[] | null;
}

const STEP_LABELS: Record<ProfileCompletionStepKey, string> = {
  company_info: 'Firma Bilgileri',
  tax_document: 'Vergi Levhas\u0131',
  k3_document: 'K3 Yetki Belgesi',
  vehicle_photos: 'Ara\u00e7 Foto\u011fraflar\u0131',
  admin_approval: 'Admin Onay\u0131',
};

const TAX_DOCUMENT_TYPES = new Set(['TAX_PLATE', 'TAX_DOCUMENT', 'VERGI_LEVHASI', 'TAX_CERTIFICATE']);
const K3_DOCUMENT_TYPES = new Set(['AUTHORIZATION_CERT', 'K3_AUTHORIZATION_CERT', 'K3_CERT', 'K3', 'K_CERTIFICATE']);

const hasText = (value: unknown): boolean =>
  typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined;

const hasDocument = (documents: CarrierCompletionDocument[] | null | undefined, acceptedTypes: Set<string>): boolean =>
  (documents ?? []).some((document) => {
    const type = String(document?.type ?? '').trim().toUpperCase();
    return acceptedTypes.has(type) && hasText(document?.fileUrl);
  });

const hasVehiclePhoto = (vehicles: CarrierCompletionVehicle[] | null | undefined): boolean =>
  (vehicles ?? []).some((vehicle) => {
    if (vehicle?.isActive === false) return false;
    const photos = Array.isArray(vehicle?.photoUrls)
      ? vehicle.photoUrls
      : Array.isArray(vehicle?.photos)
        ? vehicle.photos
        : [];
    return photos.some(hasText);
  });

const isAdminApproved = (carrier?: CarrierCompletionCarrier | null): boolean =>
  Boolean(carrier?.verifiedByAdmin);

const hasCompanyInfo = (carrier?: CarrierCompletionCarrier | null, activity?: CarrierCompletionActivity | null): boolean => {
  const city = carrier?.activityCity ?? carrier?.city ?? activity?.city;
  const address = carrier?.addressLine1 ?? carrier?.addressLine2 ?? carrier?.address ?? activity?.address;

  return [
    carrier?.companyName,
    carrier?.phone,
    city,
    address,
    carrier?.taxNumber,
  ].every(hasText);
};

export function buildCarrierProfileCompletionSummary(input: BuildCarrierProfileCompletionInput): ProfileCompletionSummary {
  const carrier = input.carrier ?? null;
  const activity = input.activity ?? null;
  const documents = input.documents ?? [];
  const vehicles = input.vehicles ?? [];

  const steps: ProfileCompletionStep[] = [
    { key: 'company_info', label: STEP_LABELS.company_info, completed: hasCompanyInfo(carrier, activity) },
    { key: 'tax_document', label: STEP_LABELS.tax_document, completed: hasDocument(documents, TAX_DOCUMENT_TYPES) },
    { key: 'k3_document', label: STEP_LABELS.k3_document, completed: hasDocument(documents, K3_DOCUMENT_TYPES) },
    { key: 'vehicle_photos', label: STEP_LABELS.vehicle_photos, completed: hasVehiclePhoto(vehicles) },
    { key: 'admin_approval', label: STEP_LABELS.admin_approval, completed: isAdminApproved(carrier) },
  ];

  const completedCount = steps.filter((step) => step.completed).length;
  const totalCount = steps.length;
  const percentage = Math.round((completedCount / totalCount) * 100);
  const missingItems = steps.filter((step) => !step.completed).map((step) => step.key);
  const isComplete = completedCount === totalCount;
  const prerequisitesComplete = steps
    .filter((step) => step.key !== 'admin_approval')
    .every((step) => step.completed);
  const adminApprovalCompleted = Boolean(steps.find((step) => step.key === 'admin_approval')?.completed);
  const statusText = isComplete
    ? 'Onayland\u0131'
    : prerequisitesComplete && !adminApprovalCompleted
      ? carrier?.pendingApproval
        ? 'Onay bekleniyor'
        : 'Onaya g\u00f6nder'
      : 'Eksikler var';

  return {
    percentage,
    completedCount,
    totalCount,
    isComplete,
    statusText,
    missingItems,
    nextIncompleteStep: missingItems[0],
    steps,
  };
}

export function getNextIncompleteStepRoute(stepKey?: ProfileCompletionStepKey): string {
  switch (stepKey) {
    case 'company_info':
      return '/profilim?tab=company';
    case 'tax_document':
    case 'k3_document':
      return '/profilim?tab=documents';
    case 'vehicle_photos':
      return '/profilim?tab=vehicles';
    case 'admin_approval':
      return '/profilim?tab=company';
    default:
      return '/profilim';
  }
}
