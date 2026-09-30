import React, { createContext, useContext, useState, useEffect } from "react";
import { authApi } from "../api/endpoints";
import { setAccessToken } from "../api/client";
import { UserRole } from "@trustshield/shared";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  organization: {
    id: string;
    name: string;
    slug: string;
    invite_code?: string;
  };
}

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  join: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const initAuth = async () => {
    try {
      // Attempt silent refresh first
      const refreshRes = await authApi.refresh();
      if (refreshRes.access_token) {
        setAccessToken(refreshRes.access_token);
        const meRes = await authApi.getMe();
        setUser(meRes.user);
      }
    } catch {
      setUser(null);
      setAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (data: any) => {
    const res = await authApi.login(data);
    setAccessToken(res.access_token);
    setUser(res.user);
  };

  const register = async (data: any) => {
    const res = await authApi.register(data);
    setAccessToken(res.access_token);
    setUser(res.user);
  };

  const join = async (data: any) => {
    const res = await authApi.join(data);
    setAccessToken(res.access_token);
    setUser(res.user);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const meRes = await authApi.getMe();
      setUser(meRes.user);
    } catch {
      // keep current
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        join,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
