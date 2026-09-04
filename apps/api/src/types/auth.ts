export interface AuthUser {
  userId: string;
  merchantId: string;
  role: "OWNER" | "ADMIN" | "STAFF";
}