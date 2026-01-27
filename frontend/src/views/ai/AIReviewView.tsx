import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { InlineError } from "@/components/auth/InlineError";
import { UserMenu } from "@/components/auth/UserMenu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/useAuth";
import {
  getAIGeneration,
  updateAICandidates,
  saveAICandidates,
} from "@/lib/api/aiApi";
import { getErrorMessage, handleApiError } from "@/lib/api/errorParser";
import { ApiError } from "@/lib/api/httpClient";
import {
  AIGenerationHeader,
  CandidateGrid,
  EditCandidateDialog,
} from "@/components/ai";
import type {
  AIGenerationResponseDto,
  CandidateVm,
  AIReviewVm,
} from "@/lib/ai/aiTypes";

type ViewMode = "loading" | "ready" | "error";

/**
 * Map AIGenerationResponseDto to AIReviewVm with computed displayFront/displayBack
 */
function mapToReviewVm(dto: AIGenerationResponseDto): AIReviewVm {
  const candidates: CandidateVm[] = dto.candidates.map((c) => ({
    id: c.id,
    front: c.front,
    back: c.back,
    status: c.status,
    editedFront: c.editedFront,
    editedBack: c.editedBack,
    displayFront: c.editedFront || c.front,
    displayBack: c.editedBack || c.back,
  }));

  return {
    generationId: dto.id,
    deckId: dto.deckId,
    aiModel: dto.aiModel,
    generatedCandidatesCount: dto.generatedCandidatesCount,
    candidates,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function AIReviewView() {
  const { accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const { generationId } = useParams<{ generationId: string }>();

  const [mode, setMode] = useState<ViewMode>("loading");
  const [error, setError] = useState<string | null>(null);
  const [generation, setGeneration] = useState<AIReviewVm | null>(null);

  // State for candidate updates
  const [updatingCandidateIds, setUpdatingCandidateIds] = useState<Set<string>>(
    new Set()
  );

  // State for save to deck
  const [isSaving, setIsSaving] = useState(false);

  // State for edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<CandidateVm | null>(
    null
  );
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  /**
   * Fetch generation from API
   */
  const fetchGeneration = useCallback(async () => {
    // Redirect if no generationId
    if (!generationId) {
      navigate("/ai/generate", { replace: true });
      return;
    }

    // Redirect if no token
    if (!accessToken) {
      setError("Brak tokenu autoryzacji. Zaloguj się ponownie.");
      setMode("error");
      return;
    }

    setMode("loading");
    setError(null);

    try {
      const response = await getAIGeneration(accessToken, generationId);
      const vm = mapToReviewVm(response);
      setGeneration(vm);
      setMode("ready");
    } catch (err) {
      // Handle 401 - session expired
      if (err instanceof ApiError && err.status === 401) {
        setError("Sesja wygasła. Zaloguj się ponownie.");
        logout();
        setMode("error");
        return;
      }

      // Handle 403 - forbidden
      if (err instanceof ApiError && err.status === 403) {
        setError("Nie masz dostępu do tej generacji.");
        setMode("error");
        return;
      }

      // Handle 404 - not found
      if (err instanceof ApiError && err.status === 404) {
        setError("Nie znaleziono sesji generowania.");
        setMode("error");
        return;
      }

      // Generic error
      setError(getErrorMessage(err));
      setMode("error");
    }
  }, [accessToken, generationId, logout, navigate]);

  // Fetch generation on mount
  useEffect(() => {
    fetchGeneration();
  }, [fetchGeneration]);

  /**
   * Handle accept candidate
   */
  const handleAccept = useCallback(
    async (candidateId: string) => {
      if (!generation || !accessToken || !generationId) return;

      // Find candidate
      const candidate = generation.candidates.find((c) => c.id === candidateId);
      if (!candidate) return;

      // Already accepted, no action needed
      if (candidate.status === "accepted") return;

      // Mark as updating
      setUpdatingCandidateIds((prev) => new Set(prev).add(candidateId));

      try {
        await updateAICandidates(accessToken, generationId, {
          candidates: [
            {
              id: candidateId,
              status: "accepted",
            },
          ],
        });

        // Update local state
        setGeneration((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            candidates: prev.candidates.map((c) =>
              c.id === candidateId ? { ...c, status: "accepted" } : c
            ),
          };
        });
      } catch (err) {
        // Handle 401 - session expired
        if (err instanceof ApiError && err.status === 401) {
          setError("Sesja wygasła. Zaloguj się ponownie.");
          logout();
          setMode("error");
          return;
        }

        // Generic error - show error and refresh to sync state
        const message = getErrorMessage(err);
        setError(`Nie udało się zaakceptować kandydata: ${message}`);
        // Optionally refresh to sync state
        fetchGeneration();
      } finally {
        // Remove from updating set
        setUpdatingCandidateIds((prev) => {
          const next = new Set(prev);
          next.delete(candidateId);
          return next;
        });
      }
    },
    [accessToken, generation, generationId, logout, fetchGeneration]
  );

  /**
   * Handle reject candidate
   */
  const handleReject = useCallback(
    async (candidateId: string) => {
      if (!generation || !accessToken || !generationId) return;

      // Find candidate
      const candidate = generation.candidates.find((c) => c.id === candidateId);
      if (!candidate) return;

      // Mark as updating
      setUpdatingCandidateIds((prev) => new Set(prev).add(candidateId));

      try {
        await updateAICandidates(accessToken, generationId, {
          candidates: [
            {
              id: candidateId,
              status: "rejected",
            },
          ],
        });

        // Remove from UI (per US-011)
        setGeneration((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            candidates: prev.candidates.filter((c) => c.id !== candidateId),
          };
        });
      } catch (err) {
        // Handle 401 - session expired
        if (err instanceof ApiError && err.status === 401) {
          setError("Sesja wygasła. Zaloguj się ponownie.");
          logout();
          setMode("error");
          return;
        }

        // Generic error - show error and refresh to sync state
        const message = getErrorMessage(err);
        setError(`Nie udało się odrzucić kandydata: ${message}`);
        // Optionally refresh to sync state
        fetchGeneration();
      } finally {
        // Remove from updating set
        setUpdatingCandidateIds((prev) => {
          const next = new Set(prev);
          next.delete(candidateId);
          return next;
        });
      }
    },
    [accessToken, generation, generationId, logout, fetchGeneration]
  );

  /**
   * Handle open edit dialog
   */
  const handleEditRequest = useCallback((candidate: CandidateVm) => {
    setEditingCandidate(candidate);
    setEditDialogOpen(true);
  }, []);

  /**
   * Handle edit submit
   */
  const handleEditSubmit = useCallback(
    async (candidateId: string, editedFront: string, editedBack: string) => {
      if (!generation || !accessToken || !generationId) return;

      setIsEditSubmitting(true);

      try {
        await updateAICandidates(accessToken, generationId, {
          candidates: [
            {
              id: candidateId,
              status: "edited",
              editedFront,
              editedBack,
            },
          ],
        });

        // Update local state
        setGeneration((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            candidates: prev.candidates.map((c) =>
              c.id === candidateId
                ? {
                    ...c,
                    status: "edited" as const,
                    editedFront,
                    editedBack,
                    displayFront: editedFront,
                    displayBack: editedBack,
                  }
                : c
            ),
          };
        });

        // Close dialog
        setEditDialogOpen(false);
        setEditingCandidate(null);
      } catch (err) {
        // Handle 401 - session expired
        if (err instanceof ApiError && err.status === 401) {
          setError("Sesja wygasła. Zaloguj się ponownie.");
          logout();
          setMode("error");
          setEditDialogOpen(false);
          return;
        }

        // Handle 400 - validation error
        if (err instanceof ApiError && err.status === 400) {
          const { globalError } = handleApiError(err);
          setError(
            globalError || "Nie udało się zapisać zmian. Sprawdź dane i spróbuj ponownie."
          );
          return;
        }

        // Generic error
        const message = getErrorMessage(err);
        setError(`Nie udało się zapisać zmian: ${message}`);
      } finally {
        setIsEditSubmitting(false);
      }
    },
    [accessToken, generation, generationId, logout]
  );

  /**
   * Handle save to deck
   */
  const handleSave = useCallback(async () => {
    if (!generation || !accessToken || !generationId) return;

    // Guard: check if there are any accepted/edited candidates
    const acceptedOrEditedCount = generation.candidates.filter(
      (c) => c.status === "accepted" || c.status === "edited"
    ).length;

    if (acceptedOrEditedCount === 0) {
      setError("Zaakceptuj lub edytuj przynajmniej jedną fiszkę.");
      return;
    }

    // Guard: check if deck exists
    if (!generation.deckId) {
      setError("Talia została usunięta – nie można zapisać fiszek.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await saveAICandidates(accessToken, generationId);

      // Navigate to deck details on success
      navigate(`/decks/${generation.deckId}`, { replace: true });
    } catch (err) {
      // Handle 401 - session expired
      if (err instanceof ApiError && err.status === 401) {
        setError("Sesja wygasła. Zaloguj się ponownie.");
        logout();
        return;
      }

      // Handle 403 - forbidden
      if (err instanceof ApiError && err.status === 403) {
        setError("Nie masz dostępu do tej talii.");
        return;
      }

      // Handle 404 - deck or generation not found
      if (err instanceof ApiError && err.status === 404) {
        setError("Talia została usunięta – nie można zapisać fiszek.");
        return;
      }

      // Handle 400 - no candidates to save
      if (err instanceof ApiError && err.status === 400) {
        setError("Brak zaakceptowanych lub edytowanych kandydatów do zapisania.");
        return;
      }

      // Generic error
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }, [accessToken, generation, generationId, logout, navigate]);

  /**
   * Handle retry
   */
  const handleRetry = useCallback(() => {
    fetchGeneration();
  }, [fetchGeneration]);

  /**
   * Handle navigate to generate
   */
  const handleNavigateToGenerate = useCallback(() => {
    navigate("/ai/generate");
  }, [navigate]);

  /**
   * Handle navigate to decks
   */
  const handleNavigateToDecks = useCallback(() => {
    navigate("/decks");
  }, [navigate]);

  // Calculate counts for header
  const totalCount = generation?.candidates.length || 0;
  const acceptedCount =
    generation?.candidates.filter((c) => c.status === "accepted").length || 0;
  const editedCount =
    generation?.candidates.filter((c) => c.status === "edited").length || 0;
  const rejectedCount = 0; // Rejected candidates are removed from UI

  // Filter out rejected candidates for display
  const visibleCandidates =
    generation?.candidates.filter((c) => c.status !== "rejected") || [];

  return (
    <ProtectedRoute>
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="space-y-6">
          {/* User menu */}
          <div className="flex justify-end">
            <UserMenu />
          </div>

          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Przegląd fiszek (AI)</h1>
            <p className="text-muted-foreground">
              Wszystkie fiszki są domyślnie zaakceptowane. Odrzuć te, które nie
              są poprawne, lub edytuj te, które wymagają poprawek.
            </p>
          </div>

          {/* Loading state */}
          {mode === "loading" && (
            <div className="flex flex-col items-center justify-center space-y-4 py-12">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-muted-foreground">
                Ładowanie kandydatów...
              </p>
            </div>
          )}

          {/* Error state */}
          {mode === "error" && (
            <div className="space-y-4">
              <InlineError message={error} />
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button variant="default" onClick={handleRetry}>
                  Spróbuj ponownie
                </Button>
                <Button variant="outline" onClick={handleNavigateToGenerate}>
                  Wróć do generowania
                </Button>
                <Button variant="outline" onClick={handleNavigateToDecks}>
                  Przejdź do talii
                </Button>
              </div>
            </div>
          )}

          {/* Ready state */}
          {mode === "ready" && generation && (
            <div className="space-y-6">
              {/* Global error (e.g. from update/save operations) */}
              {error && <InlineError message={error} />}

              {/* Header with metrics */}
              <AIGenerationHeader
                total={totalCount}
                acceptedCount={acceptedCount}
                editedCount={editedCount}
                rejectedCount={rejectedCount}
                deckId={generation.deckId}
                isSaving={isSaving}
                onSave={handleSave}
              />

              {/* Candidate grid */}
              <CandidateGrid
                candidates={visibleCandidates}
                generatedCandidatesCount={generation.generatedCandidatesCount}
                isUpdatingIds={updatingCandidateIds}
                onAccept={handleAccept}
                onReject={handleReject}
                onEditRequest={handleEditRequest}
              />
            </div>
          )}
        </div>

        {/* Edit dialog */}
        <EditCandidateDialog
          open={editDialogOpen}
          candidate={editingCandidate}
          isSubmitting={isEditSubmitting}
          onOpenChange={setEditDialogOpen}
          onSubmit={handleEditSubmit}
        />
      </div>
    </ProtectedRoute>
  );
}
