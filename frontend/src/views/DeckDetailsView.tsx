import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { InlineError } from "@/components/auth/InlineError";
import { useAuth } from "@/lib/auth/useAuth";
import { getDeck } from "@/lib/api/decksApi";
import { listFlashcardsInDeck } from "@/lib/api/flashcardsApi";
import { getErrorMessage } from "@/lib/api/errorParser";
import { ApiError } from "@/lib/api/httpClient";
import { DeckHeader } from "@/components/decks/DeckHeader";
import { FlashcardList } from "@/components/flashcards/FlashcardList";
import { EmptyFlashcardsState } from "@/components/flashcards/EmptyFlashcardsState";
import { CreateFlashcardDialog } from "@/components/flashcards/CreateFlashcardDialog";
import { EditFlashcardDialog } from "@/components/flashcards/EditFlashcardDialog";
import { ConfirmDeleteFlashcardDialog } from "@/components/flashcards/ConfirmDeleteFlashcardDialog";
import type {
  FlashcardListItemVm,
  FlashcardResponseDto,
} from "@/lib/flashcards/flashcardTypes";
import type { DeckResponseDto, PageMetaDto } from "@/lib/decks/deckTypes";

export function DeckDetailsView() {
  const { deckId } = useParams<{ deckId: string }>();
  const { accessToken, logout } = useAuth();
  const navigate = useNavigate();

  // Deck and flashcards state
  const [deck, setDeck] = useState<DeckResponseDto | null>(null);
  const [flashcards, setFlashcards] = useState<FlashcardListItemVm[]>([]);
  const [isLoadingDeck, setIsLoadingDeck] = useState(true);
  const [isLoadingFlashcards, setIsLoadingFlashcards] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageMeta, setPageMeta] = useState<PageMetaDto | null>(null);

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedFlashcard, setSelectedFlashcard] = useState<FlashcardListItemVm | null>(null);

  /**
   * Fetch deck details from API
   */
  const fetchDeck = useCallback(async () => {
    if (!accessToken || !deckId) {
      setError("Brak tokenu autoryzacji lub identyfikatora talii.");
      setIsLoadingDeck(false);
      return;
    }

    setIsLoadingDeck(true);
    setError(null);

    try {
      const deckData = await getDeck(deckId);
      setDeck(deckData);
    } catch (err) {
      // Handle 401 - session expired
      if (err instanceof ApiError && err.status === 401) {
        setError("Sesja wygasła. Zaloguj się ponownie.");
        logout();
        return;
      }

      // Handle 404 - deck not found
      if (err instanceof ApiError && err.status === 404) {
        setError("Nie znaleziono talii lub nie masz do niej dostępu.");
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setIsLoadingDeck(false);
    }
  }, [accessToken, deckId, logout]);

  /**
   * Fetch flashcards list from API
   */
  const fetchFlashcards = useCallback(async () => {
    if (!accessToken || !deckId) {
      setError("Brak tokenu autoryzacji lub identyfikatora talii.");
      setIsLoadingFlashcards(false);
      return;
    }

    setIsLoadingFlashcards(true);
    setError(null);

    try {
      const response = await listFlashcardsInDeck(deckId, {
        size: 100,
        sort: "createdAt,desc",
      });

      setFlashcards(response.content);
      setPageMeta(response.page);
    } catch (err) {
      // Handle 401 - session expired
      if (err instanceof ApiError && err.status === 401) {
        setError("Sesja wygasła. Zaloguj się ponownie.");
        logout();
        return;
      }

      // Handle 404 - deck not found
      if (err instanceof ApiError && err.status === 404) {
        setError("Nie znaleziono talii lub nie masz do niej dostępu.");
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setIsLoadingFlashcards(false);
    }
  }, [accessToken, deckId, logout]);

  /**
   * Fetch both deck and flashcards
   */
  const fetchAll = useCallback(() => {
    fetchDeck();
    fetchFlashcards();
  }, [fetchDeck, fetchFlashcards]);

  // Fetch data on mount and when deckId changes
  useEffect(() => {
    if (!deckId) {
      setError("Nieprawidłowy identyfikator talii.");
      setIsLoadingDeck(false);
      setIsLoadingFlashcards(false);
      return;
    }

    fetchAll();
  }, [deckId, fetchAll]);

  /**
   * Handle flashcard creation
   */
  const handleCreated = useCallback(
    (_flashcard: FlashcardResponseDto) => {
      // Refetch both deck (for updated count) and flashcards list
      fetchAll();
    },
    [fetchAll]
  );

  /**
   * Handle flashcard update
   */
  const handleUpdated = useCallback(
    (_flashcard: FlashcardResponseDto) => {
      // Refetch flashcards list to reflect source changes (ai -> ai-edited)
      fetchFlashcards();
    },
    [fetchFlashcards]
  );

  /**
   * Handle flashcard deletion
   */
  const handleDeleted = useCallback(
    (_flashcardId: string) => {
      // Refetch both deck (for updated count) and flashcards list
      fetchAll();
    },
    [fetchAll]
  );

  /**
   * Open create dialog
   */
  const handleCreateClick = useCallback(() => {
    setCreateOpen(true);
  }, []);

  /**
   * Open edit dialog
   */
  const handleEditClick = useCallback((flashcard: FlashcardListItemVm) => {
    setSelectedFlashcard(flashcard);
    setEditOpen(true);
  }, []);

  /**
   * Open delete confirmation dialog
   */
  const handleDeleteClick = useCallback((flashcard: FlashcardListItemVm) => {
    setSelectedFlashcard(flashcard);
    setDeleteOpen(true);
  }, []);

  /**
   * Navigate to study mode
   */
  const handleStudyClick = useCallback(() => {
    if (!deckId) return;
    navigate(`/decks/${deckId}/study`);
  }, [deckId, navigate]);

  /**
   * Navigate to AI generate view with pre-selected deck
   */
  const handleAiGenerateClick = useCallback(() => {
    if (!deckId) return;
    navigate(`/ai/generate?deckId=${deckId}`);
  }, [deckId, navigate]);

  /**
   * Retry fetching data
   */
  const handleRetry = useCallback(() => {
    fetchAll();
  }, [fetchAll]);

  const isLoading = isLoadingDeck || isLoadingFlashcards;

  return (
    <ProtectedRoute>
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="space-y-6">
          {/* Loading state */}
          {isLoading && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Ładowanie...</p>
            </div>
          )}

          {/* Error state */}
          {!isLoading && error && (
            <div className="space-y-4">
              <InlineError message={error} />
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleRetry}
                  className="text-sm text-primary hover:underline"
                >
                  Spróbuj ponownie
                </button>
                <button
                  onClick={() => navigate("/decks")}
                  className="text-sm text-primary hover:underline"
                >
                  Wróć do listy talii
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          {!isLoading && !error && deck && (
            <>
              {/* Header */}
              <DeckHeader
                deckName={deck.name}
                flashcardCount={deck.flashcardCount}
                onCreateClick={handleCreateClick}
                onStudyClick={handleStudyClick}
                onAiGenerateClick={handleAiGenerateClick}
                isDisabled={false}
              />

              {/* Empty state */}
              {flashcards.length === 0 && (
                <EmptyFlashcardsState onCreateClick={handleCreateClick} />
              )}

              {/* Flashcards list */}
              {flashcards.length > 0 && (
                <FlashcardList
                  items={flashcards}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteClick}
                />
              )}

              {/* Pagination info (optional) */}
              {pageMeta && flashcards.length > 0 && (
                <div className="text-center text-sm text-muted-foreground">
                  Wyświetlono {flashcards.length} z {pageMeta.totalElements} fiszek
                </div>
              )}
            </>
          )}
        </div>

        {/* Dialogs */}
        {accessToken && deckId && (
          <>
            <CreateFlashcardDialog
              open={createOpen}
              deckId={deckId}
              accessToken={accessToken}
              onOpenChange={setCreateOpen}
              onCreated={handleCreated}
            />

            <EditFlashcardDialog
              open={editOpen}
              flashcard={selectedFlashcard}
              accessToken={accessToken}
              onOpenChange={setEditOpen}
              onUpdated={handleUpdated}
            />

            <ConfirmDeleteFlashcardDialog
              open={deleteOpen}
              flashcard={selectedFlashcard}
              accessToken={accessToken}
              onOpenChange={setDeleteOpen}
              onDeleted={handleDeleted}
            />
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
