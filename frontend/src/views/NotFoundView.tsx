import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/useAuth";
import { NotFoundState } from "@/components/common/NotFoundState";
import { getNotFoundCta } from "@/lib/notFound/notFoundTypes";

/**
 * 404 Not Found view
 * Displays when user navigates to a non-existent route
 * Shows appropriate CTA based on authentication state
 */
export function NotFoundView() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Compute CTA based on auth state
  const cta = useMemo(
    () => getNotFoundCta(isLoading, isAuthenticated),
    [isLoading, isAuthenticated]
  );

  /**
   * Handle primary action (navigate to /decks or /login)
   */
  const handlePrimaryAction = useCallback(() => {
    navigate(cta.primaryHref);
  }, [navigate, cta.primaryHref]);

  /**
   * Handle secondary action (navigate back)
   * Fallback to primary action if history is empty
   */
  const handleSecondaryAction = useCallback(() => {
    // Try to navigate back
    // If there's no history, this will do nothing, so fallback handled by UI design
    navigate(-1);
  }, [navigate]);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <NotFoundState
        title="Nie znaleziono strony"
        description="Ta strona nie istnieje lub została przeniesiona."
        primaryActionLabel={cta.primaryLabel}
        onPrimaryAction={handlePrimaryAction}
        secondaryActionLabel={cta.showBack ? "Wróć" : undefined}
        onSecondaryAction={cta.showBack ? handleSecondaryAction : undefined}
        isPrimaryDisabled={isLoading}
      />
    </div>
  );
}
