import { api } from "./api";
import {
  AuthResponse,
  LoginCredentials,
  MeResponse,
  RegisterPayload,
} from "../types/auth";

export const TOKEN_STORAGE_KEY = "token";

export function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch (err) {
    console.error("Failed to persist auth token:", err);
  }
}

export function removeToken(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch (err) {
    console.error("Failed to remove auth token:", err);
  }
}

export function hasToken(): boolean {
  return Boolean(getToken());
}

export async function loginUser(
  credentials: LoginCredentials
): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/auth/login", credentials);
  if (response.token) {
    setToken(response.token);
  }
  return response;
}

export async function registerUser(
  payload: RegisterPayload
): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/auth/register", payload);
  if (response.token) {
    setToken(response.token);
  }
  return response;
}

export async function getCurrentUser(): Promise<MeResponse> {
  return api.get<MeResponse>("/auth/me");
}
