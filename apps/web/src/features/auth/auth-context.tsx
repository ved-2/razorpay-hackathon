"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  AuthUser,
  LoginCredentials,
  Merchant,
  RegisterPayload,
} from "@/types/auth";
import {
  DEMO_CREDENTIALS,
  getCurrentUser,
  getToken,
  loginUser,
  registerUser,
  removeToken,
} from "@/lib/auth";

interface AuthContextType {
  user: AuthUser | null;
  merchant: Merchant | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  loginAsDemo: () => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshSession = useCallback(async () => {
    let savedToken = getToken();
    if (!savedToken) {
      const isExplicitLogout =
        typeof window !== "undefined" &&
        sessionStorage.getItem("commerceos_logged_out") === "true";

      if (!isExplicitLogout) {
        try {
          const res = await loginUser(DEMO_CREDENTIALS);
          setUser(res.user);
          setMerchant(res.merchant);
          setTokenState(res.token);
          setIsLoading(false);
          return;
        } catch (err) {
          console.warn("Auto demo login failed:", err);
        }
      }

      setUser(null);
      setMerchant(null);
      setTokenState(null);
      setIsLoading(false);
      return;
    }

    setTokenState(savedToken);

    try {
      const response = await getCurrentUser();
      setUser(response.user);
      setMerchant(response.merchant);
    } catch (err) {
      console.warn("Failed to restore auth session:", err);
      removeToken();
      setUser(null);
      setMerchant(null);
      setTokenState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();

    function handleUnauthorized() {
      removeToken();
      setUser(null);
      setMerchant(null);
      setTokenState(null);
      setIsLoading(false);
    }

    window.addEventListener("commerceos:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("commerceos:unauthorized", handleUnauthorized);
    };
  }, [refreshSession]);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("commerceos_logged_out");
      }
      const response = await loginUser(credentials);
      setUser(response.user);
      setMerchant(response.merchant);
      setTokenState(response.token);
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsDemo = async () => {
    await login(DEMO_CREDENTIALS);
  };

  const register = async (payload: RegisterPayload) => {
    setIsLoading(true);
    try {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("commerceos_logged_out");
      }
      const response = await registerUser(payload);
      setUser(response.user);
      setMerchant(response.merchant);
      setTokenState(response.token);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("commerceos_logged_out", "true");
    }
    removeToken();
    setUser(null);
    setMerchant(null);
    setTokenState(null);
  };

  const value: AuthContextType = {
    user,
    merchant,
    token,
    isLoading,
    isAuthenticated: Boolean(token && user),
    login,
    loginAsDemo,
    register,
    logout,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
