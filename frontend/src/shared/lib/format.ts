export function formatLocalDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
}

export function formatFieldLabel(key: string): string {
  const normalized = key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
