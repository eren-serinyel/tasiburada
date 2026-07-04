export type RequestedCarrierServices = Record<string, {
  catalogServiceIds: string[];
  customServiceIds: string[];
}>;

export type CarrierServiceForReconcile = {
  id: unknown;
  source?: string;
};

export type CarrierServiceGroupForReconcile = {
  carrierId: string;
  services: Array<{
    items?: CarrierServiceForReconcile[];
  }>;
};

const unique = (values: unknown[]) => Array.from(new Set(values.map(normalizeServiceId).filter(Boolean)));

export const normalizeServiceId = (value: unknown) => String(value ?? '').trim();

export const normalizeRequestedCarrierServices = (input: unknown): RequestedCarrierServices => {
  if (!input || typeof input !== 'object') return {};

  return Object.entries(input as Record<string, any>).reduce<RequestedCarrierServices>((acc, [carrierId, value]) => {
    if (!value || typeof value !== 'object') return acc;

    acc[normalizeServiceId(carrierId)] = {
      catalogServiceIds: unique(Array.isArray(value.catalogServiceIds) ? value.catalogServiceIds : []),
      customServiceIds: unique(Array.isArray(value.customServiceIds) ? value.customServiceIds : []),
    };
    return acc;
  }, {});
};

export const reconcileRequestedCarrierServices = (
  requested: RequestedCarrierServices,
  carrierGroups: CarrierServiceGroupForReconcile[],
) => {
  let removedCount = 0;

  const next = Object.entries(normalizeRequestedCarrierServices(requested)).reduce<RequestedCarrierServices>(
    (acc, [carrierId, services]) => {
      const carrierGroup = carrierGroups.find((group) => normalizeServiceId(group.carrierId) === carrierId);
      const availableItems = carrierGroup?.services.flatMap((group) => group.items ?? []) ?? [];

      if (!carrierGroup || availableItems.length === 0) {
        acc[carrierId] = services;
        return acc;
      }

      const catalogIds = new Set(
        availableItems
          .filter((service) => service.source !== 'custom')
          .map((service) => normalizeServiceId(service.id)),
      );
      const customIds = new Set(
        availableItems
          .filter((service) => service.source === 'custom')
          .map((service) => normalizeServiceId(service.id)),
      );

      const catalogServiceIds = services.catalogServiceIds.filter((id) => catalogIds.has(normalizeServiceId(id)));
      const customServiceIds = services.customServiceIds.filter((id) => customIds.has(normalizeServiceId(id)));
      removedCount += services.catalogServiceIds.length - catalogServiceIds.length;
      removedCount += services.customServiceIds.length - customServiceIds.length;

      if (catalogServiceIds.length || customServiceIds.length) {
        acc[carrierId] = { catalogServiceIds, customServiceIds };
      }

      return acc;
    },
    {},
  );

  return { next, removedCount };
};
