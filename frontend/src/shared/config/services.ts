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

export function hasServiceCapability(
  serviceKey: string,
  capability: string,
): boolean {
  const service = getRegisteredService(serviceKey);
  return service?.capabilities.some((value) => value === capability) ?? false;
}
