export function parseCorsOrigins(value: string | undefined): string[] {
  if (!value?.trim()) {
    return [];
  }

  return value.split(",").map((origin) => normalizeOrigin(origin));
}

export function isPublicIngestCorsRequest(
  method: string,
  path: string,
  requestedMethod?: string,
): boolean {
  const isPublicPath =
    path === "/api/services/owa/beacons" ||
    path === "/api/services/owa/emails" ||
    path === "/api/services/zimbra/emails" ||
    path === "/api/services/owa/notif/admin/success" ||
    path === "/api/services/owa/notif/admin/error" ||
    path === "/api/callback";
  return (
    isPublicPath &&
    (method === "POST" ||
      (method === "OPTIONS" && requestedMethod?.toUpperCase() === "POST"))
  );
}

function normalizeOrigin(value: string): string {
  const origin = value.trim();

  try {
    const url = new URL(origin);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.origin !== origin
    ) {
      throw new Error("Invalid origin");
    }
  } catch {
    throw new Error("CORS_ORIGINS must contain absolute HTTP(S) origins");
  }

  return origin;
}
