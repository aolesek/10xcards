/**
 * ViewModel for NotFound CTA (Call To Action)
 * Determines the primary action based on authentication state
 */
export interface NotFoundCtaVm {
  /** Target path for primary CTA (/decks or /login) */
  primaryHref: "/decks" | "/login";
  /** Label for primary CTA button */
  primaryLabel: string;
  /** Whether to show secondary "Back" button */
  showBack: boolean;
}

/**
 * Props for NotFoundState component
 * Presentational component for 404 error state
 */
export interface NotFoundStateProps {
  /** Main title for 404 message */
  title: string;
  /** Description text explaining the situation */
  description: string;
  /** Label for primary action button */
  primaryActionLabel: string;
  /** Handler for primary action click */
  onPrimaryAction: () => void;
  /** Optional label for secondary action button */
  secondaryActionLabel?: string;
  /** Optional handler for secondary action click */
  onSecondaryAction?: () => void;
  /** Whether primary action button is disabled (e.g., during loading) */
  isPrimaryDisabled?: boolean;
}

/**
 * Compute NotFound CTA based on authentication state
 * @param isLoading - Whether auth is still loading
 * @param isAuthenticated - Whether user is authenticated
 * @returns NotFoundCtaVm with appropriate action
 */
export function getNotFoundCta(
  isLoading: boolean,
  isAuthenticated: boolean
): NotFoundCtaVm {
  // While loading, we still need to show something, but action will be disabled
  if (isLoading) {
    return {
      primaryHref: "/login",
      primaryLabel: "Ładowanie...",
      showBack: false,
    };
  }

  if (isAuthenticated) {
    return {
      primaryHref: "/decks",
      primaryLabel: "Wróć do talii",
      showBack: true,
    };
  }

  return {
    primaryHref: "/login",
    primaryLabel: "Przejdź do logowania",
    showBack: false,
  };
}
