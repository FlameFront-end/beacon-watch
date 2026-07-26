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

export function hasServiceCapability(
  serviceKey: string,
  capability: string,
): boolean {
  const service = getRegisteredService(serviceKey);
  return service?.capabilities.some((value) => value === capability) ?? false;
}

export function getDefaultServicePath(serviceKey: string): string {
  const service = getRegisteredService(serviceKey);
  if (!service) {
    return "/";
  }

  if (service.capabilities.includes("beacons")) {
    return `/${service.key}/beacons`;
  }

  if (service.capabilities.includes("emails")) {
    return `/${service.key}/emails`;
  }

  return "/";
}
