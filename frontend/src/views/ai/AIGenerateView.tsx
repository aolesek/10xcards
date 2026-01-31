import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { InlineError } from "@/components/auth/InlineError";
import { UserMenu } from "@/components/auth/UserMenu";
import { useAuth } from "@/lib/auth/useAuth";
import { listDecks } from "@/lib/api/decksApi";
import { getErrorMessage } from "@/lib/api/errorParser";
import { ApiError } from "@/lib/api/httpClient";
import { CreateDeckDialog } from "@/components/decks/CreateDeckDialog";
import { AIGenerateForm } from "@/components/ai";
import { validateGenerateForm } from "@/lib/ai/validateGenerate";
import { AI_MODEL_OPTIONS, DEFAULT_AI_MODEL } from "@/lib/ai/aiModels";
import {
  AI_GENERATION_MODE_OPTIONS,
  DEFAULT_AI_GENERATION_MODE,
} from "@/lib/ai/aiGenerationModes";
import type {
  AIGenerateFormVm,
  AIGenerateFormErrorsVm,
  DeckOptionVm,
  AIGenerateNavigationState,
  AIGenerationMode,
} from "@/lib/ai/aiTypes";
import type { AIModelId } from "@/lib/ai/aiModels";
import type { DeckResponseDto } from "@/lib/decks/deckTypes";

export function AIGenerateView() {
  const { accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Deck options state
  const [deckOptions, setDeckOptions] = useState<DeckOptionVm[]>([]);
  const [isDecksLoading, setIsDecksLoading] = useState(true);
  const [decksError, setDecksError] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState<AIGenerateFormVm>({
    deckId: "",
    sourceText: "",
    requestedCandidatesCount: 10,
    model: DEFAULT_AI_MODEL,
    mode: DEFAULT_AI_GENERATION_MODE,
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
      const response = await listDecks({
        size: 100,
        sort: "createdAt,desc",
      });

      const options: DeckOptionVm[] = response.content.map((deck) => ({
        value: deck.id,
        label: deck.name,
        flashcardCount: deck.flashcardCount,
      }));

      setDeckOptions(options);

      // Pre-select deck from query param if provided
      const preselectedDeckId = searchParams.get("deckId");
      if (preselectedDeckId && options.some((opt) => opt.value === preselectedDeckId)) {
        setForm((prev) => ({ ...prev, deckId: preselectedDeckId }));
      }
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
  }, [accessToken, logout, searchParams]);

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
   * Handle model change
   */
  const handleModelChange = useCallback((model: AIModelId) => {
    setForm((prev) => ({ ...prev, model }));
    setErrors((prev) => ({ ...prev, model: undefined }));
  }, []);

  /**
   * Handle mode change
   */
  const handleModeChange = useCallback((mode: AIGenerationMode) => {
    setForm((prev) => ({ ...prev, mode }));
    setErrors((prev) => ({ ...prev, mode: undefined }));
  }, []);

  /**
   * Handle source text change
   */
  const handleSourceTextChange = useCallback((value: string) => {
    setForm((prev) => ({ ...prev, sourceText: value }));
    setErrors((prev) => ({ ...prev, sourceText: undefined }));
  }, []);

  /**
   * Handle requested candidates count change
   */
  const handleRequestedCandidatesCountChange = useCallback((value: number) => {
    setForm((prev) => ({ ...prev, requestedCandidatesCount: value }));
    setErrors((prev) => ({ ...prev, requestedCandidatesCount: undefined }));
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
      requestedCandidatesCount: form.requestedCandidatesCount,
      model: form.model,
      mode: form.mode,
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
      <div className="container mx-auto max-w-3xl px-4 py-8" data-testid="ai-generate-view">
        <div className="space-y-6">
          {/* User menu */}
          <div className="flex justify-end">
            <UserMenu />
          </div>

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
              modelOptions={AI_MODEL_OPTIONS}
              modeOptions={AI_GENERATION_MODE_OPTIONS}
              isDecksLoading={isDecksLoading}
              isSubmitting={isSubmitting}
              onDeckChange={handleDeckChange}
              onModelChange={handleModelChange}
              onModeChange={handleModeChange}
              onSourceTextChange={handleSourceTextChange}
              onRequestedCandidatesCountChange={handleRequestedCandidatesCountChange}
              onOpenCreateDeckDialog={handleOpenCreateDeckDialog}
              onSubmit={handleSubmit}
            />
          )}
        </div>

        {/* Create deck dialog */}
        <CreateDeckDialog
          open={isCreateDeckOpen}
          onOpenChange={setIsCreateDeckOpen}
          onCreated={handleDeckCreated}
        />
      </div>
    </ProtectedRoute>
  );
}
