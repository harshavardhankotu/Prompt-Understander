// @refresh reset
import React, { createContext, useContext, useEffect, useState } from "react";
import { setAuthTokenGetter, useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import type { User } from "@workspace/api-client-react";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("omnibid_token"));

  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem("omnibid_token"));
    return () => setAuthTokenGetter(null);
  }, []);

  const { data: user, isLoading } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
      queryKey: getGetMeQueryKey(),
    },
  });

  const handleLogin = (newToken: string) => {
    localStorage.setItem("omnibid_token", newToken);
    setToken(newToken);
    setAuthTokenGetter(() => localStorage.getItem("omnibid_token"));
  };

  const handleLogout = () => {
    localStorage.removeItem("omnibid_token");
    setToken(null);
    setAuthTokenGetter(null);
  };

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading, login: handleLogin, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
