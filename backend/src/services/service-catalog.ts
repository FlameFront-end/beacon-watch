import { NotFoundException } from "@nestjs/common";

export type ServiceKey = "owa";
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
