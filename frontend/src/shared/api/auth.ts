import { http } from "./axios-instance";

export type CurrentUser = {
  readonly username: string;
};

export type LoginCredentials = {
  readonly username: string;
  readonly password: string;
};

export async function loginAdmin(
  credentials: LoginCredentials,
): Promise<CurrentUser> {
  const response = await http.post<CurrentUser>("/auth/login", credentials);
  return response.data;
}

export async function logoutAdmin(): Promise<void> {
  await http.post("/auth/logout");
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const response = await http.get<CurrentUser>("/auth/me");
  return response.data;
}
