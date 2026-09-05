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
    const savedToken = getToken();
    if (!savedToken) {
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
      const response = await loginUser(credentials);
      setUser(response.user);
      setMerchant(response.merchant);
      setTokenState(response.token);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterPayload) => {
    setIsLoading(true);
    try {
      const response = await registerUser(payload);
      setUser(response.user);
      setMerchant(response.merchant);
      setTokenState(response.token);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
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
