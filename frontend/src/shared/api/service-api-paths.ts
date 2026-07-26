export function serviceBeaconsPath(
  serviceKey: string,
  beaconId?: string,
): string {
  const collectionPath = `/api/services/${encodeURIComponent(serviceKey)}/beacons`;
  return beaconId
    ? `${collectionPath}/${encodeURIComponent(beaconId)}`
    : collectionPath;
}

export function serviceEmailsPath(
  serviceKey: string,
  emailId?: string,
): string {
  const collectionPath = `/api/services/${encodeURIComponent(serviceKey)}/emails`;
  return emailId
    ? `${collectionPath}/${encodeURIComponent(emailId)}`
    : collectionPath;
}

export function serviceEventsPath(serviceKey: string): string {
  return `/api/services/${encodeURIComponent(serviceKey)}/events`;
}

export function serviceEventsUrl(serviceKey: string, apiOrigin: string): string {
  return apiOrigin
    ? `${apiOrigin}${serviceEventsPath(serviceKey)}`
    : serviceEventsPath(serviceKey);
}
