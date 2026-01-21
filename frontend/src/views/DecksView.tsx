import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { InlineError } from "@/components/auth/InlineError";
import { useAuth } from "@/lib/auth/useAuth";
import { listDecks } from "@/lib/api/decksApi";
import { getErrorMessage } from "@/lib/api/errorParser";
import { ApiError } from "@/lib/api/httpClient";
import { DecksHeader } from "@/components/decks/DecksHeader";
import { DeckGrid } from "@/components/decks/DeckGrid";
import { EmptyState } from "@/components/decks/EmptyState";
import { CreateDeckDialog } from "@/components/decks/CreateDeckDialog";
import { EditDeckDialog } from "@/components/decks/EditDeckDialog";
import { ConfirmDeleteDialog } from "@/components/decks/ConfirmDeleteDialog";
import type {
  DeckListItemVm,
  DeckResponseDto,
  PageMetaDto,
} from "@/lib/decks/deckTypes";

export function DecksView() {
  const { accessToken, logout } = useAuth();
  const navigate = useNavigate();

  // List state
  const [items, setItems] = useState<DeckListItemVm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageMeta, setPageMeta] = useState<PageMetaDto | null>(null);

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState<DeckListItemVm | null>(null);

  /**
   * Fetch decks list from API
   */
  const fetchDecks = useCallback(async () => {
    if (!accessToken) {
      setError("Brak tokenu autoryzacji. Zaloguj się ponownie.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await listDecks(accessToken, {
        size: 100,
        sort: "createdAt,desc",
      });

      setItems(response.content);
      setPageMeta(response.page);
    } catch (err) {
      // Handle 401 - session expired
      if (err instanceof ApiError && err.status === 401) {
        setError("Sesja wygasła. Zaloguj się ponownie.");
        logout();
        return;
      }

      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, logout]);

  // Fetch decks on mount
  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  /**
   * Handle deck creation
   */
  const handleCreated = useCallback(
    (_deck: DeckResponseDto) => {
      // Refetch list to ensure consistency
      fetchDecks();
    },
    [fetchDecks]
  );

  /**
   * Handle deck update
   */
  const handleUpdated = useCallback(
    (_deck: DeckResponseDto) => {
      // Refetch list to ensure consistency
      fetchDecks();
    },
    [fetchDecks]
  );

  /**
   * Handle deck deletion
   */
  const handleDeleted = useCallback(
    (_deckId: string) => {
      // Refetch list to ensure consistency
      fetchDecks();
    },
    [fetchDecks]
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
  const handleEditClick = useCallback((deck: DeckListItemVm) => {
    setSelectedDeck(deck);
    setEditOpen(true);
  }, []);

  /**
   * Open delete confirmation dialog
   */
  const handleDeleteClick = useCallback((deck: DeckListItemVm) => {
    setSelectedDeck(deck);
    setDeleteOpen(true);
  }, []);

  /**
   * Navigate to deck details
   */
  const handleOpen = useCallback(
    (deckId: string) => {
      if (!deckId) return;
      navigate(`/decks/${deckId}`);
    },
    [navigate]
  );

  /**
   * Navigate to study mode
   */
  const handleStudy = useCallback(
    (deckId: string) => {
      if (!deckId) return;
      navigate(`/decks/${deckId}/study`);
    },
    [navigate]
  );

  /**
   * Retry fetching decks
   */
  const handleRetry = useCallback(() => {
    fetchDecks();
  }, [fetchDecks]);

  return (
    <ProtectedRoute>
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <DecksHeader
            onCreateClick={handleCreateClick}
            isDisabled={isLoading}
          />

          {/* Loading state */}
          {isLoading && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Ładowanie talii...</p>
            </div>
          )}

          {/* Error state */}
          {!isLoading && error && (
            <div className="space-y-4">
              <InlineError message={error} />
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

          {/* Empty state */}
          {!isLoading && !error && items.length === 0 && (
            <EmptyState onCreateClick={handleCreateClick} />
          )}

          {/* Decks grid */}
          {!isLoading && !error && items.length > 0 && (
            <DeckGrid
              items={items}
              onOpen={handleOpen}
              onStudy={handleStudy}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
            />
          )}

          {/* Pagination info (optional) */}
          {!isLoading && !error && pageMeta && items.length > 0 && (
            <div className="text-center text-sm text-muted-foreground">
              Wyświetlono {items.length} z {pageMeta.totalElements} talii
            </div>
          )}
        </div>

        {/* Dialogs */}
        {accessToken && (
          <>
            <CreateDeckDialog
              open={createOpen}
              accessToken={accessToken}
              onOpenChange={setCreateOpen}
              onCreated={handleCreated}
            />

            <EditDeckDialog
              open={editOpen}
              deck={selectedDeck}
              accessToken={accessToken}
              onOpenChange={setEditOpen}
              onUpdated={handleUpdated}
            />

            <ConfirmDeleteDialog
              open={deleteOpen}
              deck={selectedDeck}
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
