import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { InlineError } from "@/components/auth/InlineError";
import { UserMenu } from "@/components/auth/UserMenu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/useAuth";
import { generateFlashcards } from "@/lib/api/aiApi";
import { getErrorMessage, handleApiError } from "@/lib/api/errorParser";
import { ApiError } from "@/lib/api/httpClient";
import { AITriviaLoading } from "@/components/ai";
import { validateGenerateForm } from "@/lib/ai/validateGenerate";
import type { AIGenerateNavigationState } from "@/lib/ai/aiTypes";

type ViewMode = "loading" | "error";

export function AILoadingView() {
  const { accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<ViewMode>("loading");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Generate flashcards
   */
  const generateCards = useCallback(async () => {
    const state = location.state as AIGenerateNavigationState | null;

    // Redirect if no state
    if (!state || !state.deckId || !state.sourceText || !state.requestedCandidatesCount || !state.model || !state.mode) {
      navigate("/ai/generate", { replace: true });
      return;
    }

    // Redirect if no token
    if (!accessToken) {
      setError("Brak tokenu autoryzacji. Zaloguj się ponownie.");
      setMode("error");
      setIsLoading(false);
      return;
    }

    // Validate state before API call
    const validationErrors = validateGenerateForm({
      deckId: state.deckId,
      sourceText: state.sourceText,
      requestedCandidatesCount: state.requestedCandidatesCount,
      model: state.model,
      mode: state.mode,
    });

    if (Object.keys(validationErrors).length > 0) {
      setError("Dane formularza są nieprawidłowe. Wróć i spróbuj ponownie.");
      setMode("error");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setMode("loading");

    try {
      const response = await generateFlashcards(accessToken, {
        deckId: state.deckId,
        sourceText: state.sourceText.trim(),
        requestedCandidatesCount: state.requestedCandidatesCount,
        model: state.model,
        mode: state.mode,
      });

      // Navigate to review page on success
      navigate(`/ai/review/${response.id}`, { replace: true });
    } catch (err) {
      // Handle 401 - session expired
      if (err instanceof ApiError && err.status === 401) {
        setError("Sesja wygasła. Zaloguj się ponownie.");
        logout();
        setMode("error");
        return;
      }

      // Handle 403 - forbidden or limit exceeded
      if (err instanceof ApiError && err.status === 403) {
        const { globalError } = handleApiError(err);
        setError(
          globalError ||
            "Nie masz dostępu do tej talii lub przekroczono miesięczny limit generacji AI."
        );
        setMode("error");
        return;
      }

      // Handle 404 - deck not found
      if (err instanceof ApiError && err.status === 404) {
        setError("Talia nie istnieje (mogła zostać usunięta).");
        setMode("error");
        return;
      }

      // Handle 429 - rate limit
      if (err instanceof ApiError && err.status === 429) {
        setError("Za dużo prób. Spróbuj ponownie za chwilę.");
        setMode("error");
        return;
      }

      // Handle 503 - AI service unavailable
      if (err instanceof ApiError && err.status === 503) {
        setError("Usługa AI jest chwilowo niedostępna. Spróbuj ponownie.");
        setMode("error");
        return;
      }

      // Generic error
      setError(getErrorMessage(err));
      setMode("error");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, location.state, logout, navigate]);

  // Start generation on mount
  useEffect(() => {
    generateCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  /**
   * Handle cancel and return
   */
  const handleCancel = useCallback(() => {
    navigate("/ai/generate");
  }, [navigate]);

  /**
   * Handle retry
   */
  const handleRetry = useCallback(() => {
    generateCards();
  }, [generateCards]);

  return (
    <ProtectedRoute>
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="space-y-8">
          {/* User menu */}
          <div className="flex justify-end">
            <UserMenu />
          </div>

          {/* Loading state */}
          {isLoading && mode === "loading" && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-3xl font-bold">Generuję fiszki...</h1>
                <p className="mt-2 text-muted-foreground">
                  To może potrwać chwilę. Proszę czekać...
                </p>
              </div>

              {/* Spinner */}
              <div className="flex justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>

              {/* Trivia */}
              <AITriviaLoading />

              {/* Cancel button */}
              <div className="flex justify-center">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Anuluj i wróć
                </Button>
              </div>
            </div>
          )}

          {/* Error state */}
          {!isLoading && mode === "error" && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-3xl font-bold">Wystąpił błąd</h1>
              </div>

              <InlineError message={error} />

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button type="button" variant="default" onClick={handleRetry}>
                  Spróbuj ponownie
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Wróć do formularza
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
