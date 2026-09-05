export type UserRole = "OWNER" | "ADMIN" | "STAFF";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Merchant {
  id: string;
  name: string;
  slug: string;
}

export interface AuthResponse {
  user: AuthUser;
  merchant: Merchant;
  token: string;
}

export interface MeResponse {
  user: AuthUser;
  merchant: Merchant;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  merchantName: string;
}
