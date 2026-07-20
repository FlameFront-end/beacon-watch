import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
  type ReactElement,
} from "react";

import {
  getCurrentUser,
  loginAdmin,
  logoutAdmin,
  type LoginCredentials,
} from "@/shared/api/auth";

type AuthStatus = "checking" | "authenticated" | "anonymous";

type AuthState = {
  readonly status: AuthStatus;
  readonly username: string | null;
};

type AuthContextValue = AuthState & {
  readonly login: (credentials: LoginCredentials) => Promise<void>;
  readonly logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren): ReactElement {
  const [authState, setAuthState] = useState<AuthState>({
    status: "checking",
    username: null,
  });

  useEffect(() => {
    let isMounted = true;

    void getCurrentUser()
      .then((currentUser) => {
        if (!isMounted) {
          return;
        }

        setAuthState({
          status: "authenticated",
          username: currentUser.username,
        });
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setAuthState({ status: "anonymous", username: null });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const currentUser = await loginAdmin(credentials);
    setAuthState({
      status: "authenticated",
      username: currentUser.username,
    });
  }, []);

  const logout = useCallback(async () => {
    await logoutAdmin();
    setAuthState({ status: "anonymous", username: null });
  }, []);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      ...authState,
      login,
      logout,
    }),
    [authState, login, logout],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const contextValue = useContext(AuthContext);
  if (!contextValue) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return contextValue;
}
