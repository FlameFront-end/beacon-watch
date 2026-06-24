const RAW_API_URL = import.meta.env.VITE_API_URL as string | undefined;

export const API_ORIGIN =
  RAW_API_URL && RAW_API_URL.length > 0
    ? RAW_API_URL.replace(/\/$/, "")
    : "";
