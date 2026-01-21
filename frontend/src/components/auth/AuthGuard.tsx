import { useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/useAuth";

interface AuthGuardProps {
  children: ReactNode;
}

/**
 * Guard component that redirects authenticated users away from auth pages
 * Use this to wrap login, register, and password reset pages
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // Redirect authenticated users to /decks
      navigate("/decks", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Show nothing while checking auth status
  if (isLoading) {
    return null;
  }

  // Show auth page only if not authenticated
  return isAuthenticated ? null : <>{children}</>;
}
