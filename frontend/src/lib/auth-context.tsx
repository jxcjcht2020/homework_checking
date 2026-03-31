import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import type { SessionUser } from "../types/domain";
import {
  getCurrentUser,
  login as loginWithStorage,
  logout as logoutStorage,
  refreshSession,
  register as registerWithStorage,
  updatePassword as updatePasswordWithStorage,
} from "./mock-db";

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  login: typeof loginWithStorage;
  register: typeof registerWithStorage;
  updatePassword: typeof updatePasswordWithStorage;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<SessionUser | null>(() => getCurrentUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const nextUser = await refreshSession();
        setUser(nextUser);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (role, id, password) => {
        const result = await loginWithStorage(role, id, password);
        if (result.ok) setUser(result.user ?? null);
        return result;
      },
      register: registerWithStorage,
      updatePassword: updatePasswordWithStorage,
      logout: () => {
        logoutStorage();
        setUser(null);
      },
      refresh: async () => {
        const nextUser = await refreshSession();
        setUser(nextUser);
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
