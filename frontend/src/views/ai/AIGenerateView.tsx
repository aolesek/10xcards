import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { InlineError } from "@/components/auth/InlineError";
import { useAuth } from "@/lib/auth/useAuth";
import { listDecks } from "@/lib/api/decksApi";
import { getErrorMessage } from "@/lib/api/errorParser";
import { ApiError } from "@/lib/api/httpClient";
import { CreateDeckDialog } from "@/components/decks/CreateDeckDialog";
import { AIGenerateForm } from "@/components/ai";
import { validateGenerateForm } from "@/lib/ai/validateGenerate";
import type {
  AIGenerateFormVm,
  AIGenerateFormErrorsVm,
  DeckOptionVm,
  AIGenerateNavigationState,
} from "@/lib/ai/aiTypes";
import type { DeckResponseDto } from "@/lib/decks/deckTypes";

export function AIGenerateView() {
  const { accessToken, logout } = useAuth();
  const navigate = useNavigate();

  // Deck options state
  const [deckOptions, setDeckOptions] = useState<DeckOptionVm[]>([]);
  const [isDecksLoading, setIsDecksLoading] = useState(true);
  const [decksError, setDecksError] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState<AIGenerateFormVm>({
    deckId: "",
    sourceText: "",
  });
  const [errors, setErrors] = useState<AIGenerateFormErrorsVm>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create deck dialog state
  const [isCreateDeckOpen, setIsCreateDeckOpen] = useState(false);

  /**
   * Fetch decks list from API
   */
  const fetchDecks = useCallback(async () => {
    if (!accessToken) {
      setDecksError("Brak tokenu autoryzacji. Zaloguj się ponownie.");
      setIsDecksLoading(false);
      return;
    }

    setIsDecksLoading(true);
    setDecksError(null);

    try {
      const response = await listDecks(accessToken, {
        size: 100,
        sort: "createdAt,desc",
      });

      const options: DeckOptionVm[] = response.content.map((deck) => ({
        value: deck.id,
        label: deck.name,
        flashcardCount: deck.flashcardCount,
      }));

      setDeckOptions(options);
    } catch (err) {
      // Handle 401 - session expired
      if (err instanceof ApiError && err.status === 401) {
        setDecksError("Sesja wygasła. Zaloguj się ponownie.");
        logout();
        return;
      }

      setDecksError(getErrorMessage(err));
    } finally {
      setIsDecksLoading(false);
    }
  }, [accessToken, logout]);

  // Fetch decks on mount
  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  /**
   * Handle deck change
   */
  const handleDeckChange = useCallback((deckId: string) => {
    setForm((prev) => ({ ...prev, deckId }));
    setErrors((prev) => ({ ...prev, deckId: undefined }));
  }, []);

  /**
   * Handle source text change
   */
  const handleSourceTextChange = useCallback((value: string) => {
    setForm((prev) => ({ ...prev, sourceText: value }));
    setErrors((prev) => ({ ...prev, sourceText: undefined }));
  }, []);

  /**
   * Handle open create deck dialog
   */
  const handleOpenCreateDeckDialog = useCallback(() => {
    setIsCreateDeckOpen(true);
  }, []);

  /**
   * Handle deck created
   */
  const handleDeckCreated = useCallback(
    (deck: DeckResponseDto) => {
      // Add new deck to options at the top
      const newOption: DeckOptionVm = {
        value: deck.id,
        label: deck.name,
        flashcardCount: deck.flashcardCount,
      };

      setDeckOptions((prev) => [newOption, ...prev]);

      // Select the newly created deck
      setForm((prev) => ({ ...prev, deckId: deck.id }));
      setErrors((prev) => ({ ...prev, deckId: undefined }));
    },
    []
  );

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(() => {
    // Clear previous errors
    setErrors({});

    // Validate form
    const validationErrors = validateGenerateForm(form);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Set submitting state to block double submit
    setIsSubmitting(true);

    // Navigate to loading view with state
    const navState: AIGenerateNavigationState = {
      deckId: form.deckId,
      sourceText: form.sourceText,
    };

    navigate("/ai/loading", { state: navState });
  }, [form, navigate]);

  /**
   * Retry fetching decks
   */
  const handleRetry = useCallback(() => {
    fetchDecks();
  }, [fetchDecks]);

  return (
    <ProtectedRoute>
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Generuj fiszki (AI)</h1>
            <p className="text-muted-foreground">
              Wklej tekst, z którego mają zostać wygenerowane fiszki. AI automatycznie
              stworzy kandydatów do fiszek na podstawie dostarczonego materiału.
            </p>
          </div>

          {/* Decks loading error */}
          {!isDecksLoading && decksError && (
            <div className="space-y-4">
              <InlineError message={decksError} />
              <div className="text-center">
                <button
                  onClick={handleRetry}
                  className="text-sm text-primary hover:underline"
                >
                  Spróbuj ponownie
                </button>
              </div>
            </div>
          )}

          {/* Form */}
          {!decksError && (
            <AIGenerateForm
              form={form}
              errors={errors}
              deckOptions={deckOptions}
              isDecksLoading={isDecksLoading}
              isSubmitting={isSubmitting}
              onDeckChange={handleDeckChange}
              onSourceTextChange={handleSourceTextChange}
              onOpenCreateDeckDialog={handleOpenCreateDeckDialog}
              onSubmit={handleSubmit}
            />
          )}
        </div>

        {/* Create deck dialog */}
        {accessToken && (
          <CreateDeckDialog
            open={isCreateDeckOpen}
            accessToken={accessToken}
            onOpenChange={setIsCreateDeckOpen}
            onCreated={handleDeckCreated}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
