import { Carrier, CarrierApprovalState } from '../../../domain/entities/Carrier';
import {
  CarrierDocument,
  CarrierDocumentStatus,
  CarrierDocumentType,
} from '../../../domain/entities/CarrierDocument';

export const REQUIRED_APPROVAL_DOCUMENT_TYPES: CarrierDocumentType[] = [
  CarrierDocumentType.AUTHORIZATION_CERT,
  CarrierDocumentType.SRC_CERT,
  CarrierDocumentType.VEHICLE_LICENSE,
  CarrierDocumentType.TAX_PLATE,
];

export type CarrierApprovalSectionKey =
  | 'companyInfo'
  | 'activityInfo'
  | 'services'
  | 'documents'
  | 'vehicles'
  | 'paymentInfo';

export interface CarrierApprovalSections {
  companyInfoCompleted: boolean;
  activityInfoCompleted: boolean;
  servicesCompleted: boolean;
  documentsCompleted: boolean;
  vehiclesCompleted: boolean;
  earningsCompleted: boolean;
}

export interface CarrierApprovalReadiness {
  isReadyForSubmission: boolean;
  profileFieldsComplete: boolean;
  requiredDocumentsPresent: boolean;
  requiredDocumentsValid: boolean;
  requiredDocumentsApproved: boolean;
  hasBlockingRejectionOnCurrentDraft: boolean;
  missingSections: CarrierApprovalSectionKey[];
  missingFields: string[];
  missingDocuments: string[];
  rejectedDocuments: string[];
  sections: CarrierApprovalSections;
  requiredDocuments: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  };
}

const hasText = (value: unknown): boolean =>
  typeof value === 'string' && value.trim().length > 0;

const parseStringArray = (value?: string[] | string | null): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => String(item).trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
};

export function computeCarrierApprovalReadiness(carrier: Carrier): CarrierApprovalReadiness {
  const missingFields: string[] = [];
  if (!hasText(carrier.companyName)) missingFields.push('companyName');
  if (!hasText(carrier.taxNumber)) missingFields.push('taxNumber');
  if (!hasText(carrier.phone)) missingFields.push('phone');
  if (!hasText(carrier.email)) missingFields.push('email');
  if (!Number.isFinite(Number(carrier.foundedYear)) || Number(carrier.foundedYear) <= 0) missingFields.push('foundedYear');
  if (!hasText(carrier.activity?.city)) missingFields.push('activity.city');
  if (!hasText(carrier.activity?.district)) missingFields.push('activity.district');
  if (parseStringArray(carrier.activity?.serviceAreasJson).length === 0) missingFields.push('activity.serviceAreas');
  if ((carrier.vehicleTypeLinks ?? []).length === 0) missingFields.push('vehicleTypes');
  if ((carrier.serviceTypeLinks ?? []).length === 0) missingFields.push('serviceTypes');

  const documentsByType = new Map<string, CarrierDocument[]>();
  for (const document of carrier.documents ?? []) {
    const list = documentsByType.get(document.type) ?? [];
    list.push(document);
    documentsByType.set(document.type, list);
  }

  const missingDocuments: string[] = [];
  const rejectedDocuments: string[] = [];
  let approvedCount = 0;
  let pendingCount = 0;
  let rejectedCount = 0;

  for (const requiredType of REQUIRED_APPROVAL_DOCUMENT_TYPES) {
    const docs = (documentsByType.get(requiredType) ?? []).filter((document) => hasText(document.fileUrl));
    if (!docs.length) {
      missingDocuments.push(requiredType);
      continue;
    }

    const hasRejected = docs.some((document) => document.status === CarrierDocumentStatus.REJECTED);
    const hasApproved = docs.some((document) => document.status === CarrierDocumentStatus.APPROVED && document.isApproved);
    const hasPending = docs.some((document) => document.status === CarrierDocumentStatus.PENDING);

    if (hasRejected) {
      rejectedDocuments.push(requiredType);
      rejectedCount += 1;
    } else if (hasApproved) {
      approvedCount += 1;
    } else if (hasPending) {
      pendingCount += 1;
    } else {
      pendingCount += 1;
    }
  }

  const companyInfoCompleted = !missingFields.some((field) =>
    ['companyName', 'taxNumber', 'phone', 'email', 'foundedYear'].includes(field));
  const activityInfoCompleted = !missingFields.some((field) => field.startsWith('activity.'));
  const vehiclesCompleted = !missingFields.includes('vehicleTypes');
  const servicesCompleted = !missingFields.includes('serviceTypes');
  const requiredDocumentsPresent = missingDocuments.length === 0;
  const requiredDocumentsValid = rejectedDocuments.length === 0 && requiredDocumentsPresent;
  const documentsCompleted = requiredDocumentsValid;
  const normalizedIban = String(carrier.earnings?.iban ?? '').replace(/\s+/g, '').toUpperCase();
  const earningsCompleted =
    hasText(carrier.earnings?.bankName) &&
    /^TR\d{24}$/.test(normalizedIban) &&
    hasText(carrier.earnings?.accountHolder);

  const sections: CarrierApprovalSections = {
    companyInfoCompleted,
    activityInfoCompleted,
    servicesCompleted,
    documentsCompleted,
    vehiclesCompleted,
    earningsCompleted,
  };

  const missingSections: CarrierApprovalSectionKey[] = [];
  if (!companyInfoCompleted) missingSections.push('companyInfo');
  if (!activityInfoCompleted) missingSections.push('activityInfo');
  if (!servicesCompleted) missingSections.push('services');
  if (!documentsCompleted) missingSections.push('documents');
  if (!vehiclesCompleted) missingSections.push('vehicles');
  if (!earningsCompleted) missingSections.push('paymentInfo');

  const profileFieldsComplete =
    companyInfoCompleted && activityInfoCompleted && servicesCompleted && vehiclesCompleted && earningsCompleted;
  const requiredDocumentsApproved = approvedCount === REQUIRED_APPROVAL_DOCUMENT_TYPES.length;
  const hasBlockingRejectionOnCurrentDraft =
    carrier.approvalState === CarrierApprovalState.REJECTED &&
    carrier.draftRevision <= carrier.lastReviewedDraftRevision;

  return {
    isReadyForSubmission:
      missingSections.length === 0 &&
      !hasBlockingRejectionOnCurrentDraft,
    profileFieldsComplete,
    requiredDocumentsPresent,
    requiredDocumentsValid,
    requiredDocumentsApproved,
    hasBlockingRejectionOnCurrentDraft,
    missingSections,
    missingFields,
    missingDocuments,
    rejectedDocuments,
    sections,
    requiredDocuments: {
      total: REQUIRED_APPROVAL_DOCUMENT_TYPES.length,
      approved: approvedCount,
      pending: pendingCount,
      rejected: rejectedCount,
    },
  };
}

export function calculateApprovalProfilePercentage(sections: CarrierApprovalSections): number {
  const values = Object.values(sections);
  return Math.round((values.filter(Boolean).length / values.length) * 100);
}
