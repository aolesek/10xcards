import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { tokenStorage } from "./tokenStorage";
import * as authApi from "@/lib/api/authApi";
import type {
  User,
  AuthResponseDto,
  LoginRequestDto,
  RegisterRequestDto,
} from "./authTypes";

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (dto: LoginRequestDto) => Promise<AuthResponseDto>;
  register: (dto: RegisterRequestDto) => Promise<AuthResponseDto>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Logout user
   */
  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    tokenStorage.clearTokens();
  }, []);

  /**
   * Restore session from localStorage on mount
   */
  useEffect(() => {
    const restoreSession = async () => {
      const storedAccessToken = tokenStorage.getAccessToken();
      const storedRefreshToken = tokenStorage.getRefreshToken();

      if (storedAccessToken && storedRefreshToken) {
        try {
          // Fetch current user data from backend
          const userInfo = await authApi.getCurrentUser(storedAccessToken);
          
          // Set auth state with stored tokens and fetched user data
          const userData: User = {
            id: userInfo.id,
            email: userInfo.email,
            role: userInfo.role,
            monthlyAiLimit: userInfo.monthlyAiLimit,
            aiUsageInCurrentMonth: userInfo.aiUsageInCurrentMonth,
          };
          
          setUser(userData);
          setAccessToken(storedAccessToken);
          setRefreshToken(storedRefreshToken);
          
          console.debug("Session restored for user:", userInfo.email);
        } catch (error) {
          // If token is invalid or expired, clear stored tokens
          console.error("Failed to restore session:", error);
          tokenStorage.clearTokens();
        }
      }

      setIsLoading(false);
    };

    restoreSession();
  }, []);

  /**
   * Listen for token refresh failures from authenticatedClient
   */
  useEffect(() => {
    const handleTokenRefreshFailed = () => {
      console.warn("Token refresh failed, logging out user");
      logout();
    };

    window.addEventListener("auth:token-refresh-failed", handleTokenRefreshFailed);

    return () => {
      window.removeEventListener("auth:token-refresh-failed", handleTokenRefreshFailed);
    };
  }, [logout]);

  /**
   * Set auth state from AuthResponseDto
   */
  const setAuthState = useCallback((authResponse: AuthResponseDto) => {
    const userData: User = {
      id: authResponse.id,
      email: authResponse.email,
      role: authResponse.role,
      monthlyAiLimit: authResponse.monthlyAiLimit,
      aiUsageInCurrentMonth: authResponse.aiUsageInCurrentMonth,
    };

    setUser(userData);
    setAccessToken(authResponse.accessToken);
    setRefreshToken(authResponse.refreshToken);
    tokenStorage.setTokens(authResponse.accessToken, authResponse.refreshToken);
  }, []);

  /**
   * Login user
   */
  const login = useCallback(
    async (dto: LoginRequestDto): Promise<AuthResponseDto> => {
      const response = await authApi.login(dto);
      setAuthState(response);
      return response;
    },
    [setAuthState]
  );

  /**
   * Register user (auto-login)
   */
  const register = useCallback(
    async (dto: RegisterRequestDto): Promise<AuthResponseDto> => {
      const response = await authApi.register(dto);
      setAuthState(response);
      return response;
    },
    [setAuthState]
  );

  const isAuthenticated = useMemo(() => {
    return !!(user && accessToken && refreshToken);
  }, [user, accessToken, refreshToken]);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      refreshToken,
      isAuthenticated,
      isLoading,
      login,
      register,
      logout,
    }),
    [
      user,
      accessToken,
      refreshToken,
      isAuthenticated,
      isLoading,
      login,
      register,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
