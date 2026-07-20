import axios from "axios";

import { API_ORIGIN } from "@/shared/config/api";

export const http = axios.create({
  baseURL: API_ORIGIN,
  withCredentials: true,
});
