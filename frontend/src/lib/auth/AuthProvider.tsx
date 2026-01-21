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
   * Restore session from localStorage on mount
   */
  useEffect(() => {
    const storedAccessToken = tokenStorage.getAccessToken();
    const storedRefreshToken = tokenStorage.getRefreshToken();

    if (storedAccessToken && storedRefreshToken) {
      setAccessToken(storedAccessToken);
      setRefreshToken(storedRefreshToken);
      // Note: In a real app, you might want to validate the token
      // or fetch user data from an endpoint here
    }

    setIsLoading(false);
  }, []);

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

  /**
   * Logout user
   */
  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    tokenStorage.clearTokens();
  }, []);

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
