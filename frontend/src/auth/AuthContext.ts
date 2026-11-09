import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthState, RegisterInput } from "../types/auth.types";
import type { Sessions } from "../types/api.types";
import { refreshSession, setAccessToken, authApi, api } from "../lib/api";
import type { User } from "../types/api.types";

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // restore the session from the refresh cookie on first load
  useEffect(() => {
    let cancelled = false;
    refreshSession().then((s) => {
      if (cancelled) return;
      setUser(s?.user ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const start = (s: Sessions) => {
    setAccessToken(s.accessToken);
    setUser(s.user);
  };

  const clear = () => {
    setAccessToken(null);
    setUser(null);
  };

  const login = useCallback(async (identifier: string, password: string) => {
    const { data } = await authApi.post<Sessions>("/auth/login", {
      identifier,
      password,
    });
    start(data);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const { data } = await authApi.post<Sessions>("/auth/register", input);
    start(data);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.post("/auth/logout");
    } catch {
      /* clear locally anyway */
    }
    clear();
  }, []);

  const logoutAll = useCallback(async () => {
    try {
      await api.post("/auth/logout-all");
    } catch {
      /* clear locally anyway */
    }
    clear();
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const { data } = await api.post<Sessions>("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      start(data); // the server revoked every other session and issued a fresh one for this device
    },
    [],
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      logoutAll,
      changePassword,
    }),
    [user, loading, login, register, logout, logoutAll, changePassword],
  );
  return createElement(AuthContext.Provider, { value }, children);
}

export function UseAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
