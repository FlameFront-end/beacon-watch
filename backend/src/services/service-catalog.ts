import { NotFoundException } from "@nestjs/common";

export type ServiceKey = "owa" | "zimbra";
export type ServiceCapability = "beacons" | "emails";

export type RegisteredService = {
  readonly key: ServiceKey;
  readonly name: string;
  readonly description: string;
  readonly capabilities: readonly ServiceCapability[];
};

export const REGISTERED_SERVICES: readonly RegisteredService[] = [
  {
    key: "owa",
    name: "Outlook Web App",
    description: "OWA beacon and captured email monitoring",
    capabilities: ["beacons", "emails"],
  },
  {
    key: "zimbra",
    name: "Zimbra",
    description: "Zimbra captured email monitoring",
    capabilities: ["emails"],
  },
];

export function getRegisteredService(
  serviceKey: string,
): RegisteredService | undefined {
  return REGISTERED_SERVICES.find((service) => service.key === serviceKey);
}

export function requireRegisteredService(serviceKey: string): RegisteredService {
  const service = getRegisteredService(serviceKey);
  if (!service) {
    throw new NotFoundException(`Service ${serviceKey} not found`);
  }

  return service;
}

export function hasServiceCapability(
  serviceKey: string,
  capability: ServiceCapability,
): boolean {
  const service = getRegisteredService(serviceKey);
  return service?.capabilities.includes(capability) ?? false;
}

export function requireServiceCapability(
  serviceKey: string,
  capability: ServiceCapability,
): ServiceKey {
  const service = requireRegisteredService(serviceKey);
  if (!service.capabilities.includes(capability)) {
    throw new NotFoundException(
      `Service ${serviceKey} does not support ${capability}`,
    );
  }

  return service.key;
}
