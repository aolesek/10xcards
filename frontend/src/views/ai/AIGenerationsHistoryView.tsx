import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { InlineError } from "@/components/auth/InlineError";
import { useAuth } from "@/lib/auth/useAuth";
import { listAIGenerations } from "@/lib/api/aiApi";
import { getErrorMessage } from "@/lib/api/errorParser";
import { ApiError } from "@/lib/api/httpClient";
import { AIGenerationsHistoryHeader } from "@/components/ai/history/AIGenerationsHistoryHeader";
import { AIGenerationsHistoryTable } from "@/components/ai/history/AIGenerationsHistoryTable";
import { AIGenerationsHistoryEmptyState } from "@/components/ai/history/AIGenerationsHistoryEmptyState";
import { PaginationControls } from "@/components/common/PaginationControls";
import type {
  AIGenerationHistoryRowVm,
  PageMetaDto,
  AIGenerationResponseDto,
} from "@/lib/ai/aiTypes";

/**
 * Format date for display
 * @param isoDate - ISO 8601 date string
 * @returns Formatted date string (dd.MM.yyyy HH:mm)
 */
function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  } catch {
    return isoDate;
  }
}

/**
 * Shorten hash for display
 * @param hash - Full hash string
 * @returns Shortened hash (first 12 characters + ellipsis)
 */
function shortenHash(hash: string): string {
  if (hash.length <= 12) return hash;
  return `${hash.substring(0, 12)}…`;
}

/**
 * Count accepted or edited candidates
 * @param generation - AI generation response DTO
 * @returns Count of accepted/edited candidates or null if unavailable
 */
function countAcceptedOrEdited(generation: AIGenerationResponseDto): number | null {
  if (!generation.candidates || generation.candidates.length === 0) {
    return null;
  }
  return generation.candidates.filter(
    (c) => c.status === "accepted" || c.status === "edited"
  ).length;
}

/**
 * Map DTO to ViewModel
 * @param dto - AI generation response DTO
 * @returns AI generation history row view model
 */
function mapToRowVm(dto: AIGenerationResponseDto): AIGenerationHistoryRowVm {
  return {
    id: dto.id,
    createdAt: dto.createdAt,
    createdAtLabel: formatDate(dto.createdAt),
    aiModel: dto.aiModel,
    sourceTextHash: dto.sourceTextHash,
    sourceTextHashShort: shortenHash(dto.sourceTextHash),
    sourceTextLength: dto.sourceTextLength,
    generatedCandidatesCount: dto.generatedCandidatesCount,
    acceptedOrEditedCandidatesCount: countAcceptedOrEdited(dto),
  };
}

/**
 * Custom hook for managing AI generations history state
 */
function useAIGenerationsHistory(accessToken: string | null, page: number, size: number) {
  const { logout } = useAuth();
  const [rows, setRows] = useState<AIGenerationHistoryRowVm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageMeta, setPageMeta] = useState<PageMetaDto | null>(null);

  const fetchGenerations = useCallback(async () => {
    if (!accessToken) {
      setError("Brak tokenu autoryzacji. Zaloguj się ponownie.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const abortController = new AbortController();

    try {
      const response = await listAIGenerations(
        {
          page,
          size,
          sort: "createdAt,desc",
        },
        abortController.signal
      );

      const mappedRows = response.content.map(mapToRowVm);
      setRows(mappedRows);
      setPageMeta(response.page);
    } catch (err) {
      // Handle abort
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }

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

    return () => {
      abortController.abort();
    };
  }, [accessToken, page, size, logout]);

  useEffect(() => {
    fetchGenerations();
  }, [fetchGenerations]);

  return {
    rows,
    isLoading,
    error,
    pageMeta,
    retry: fetchGenerations,
  };
}

/**
 * AI Generations History View
 */
export function AIGenerationsHistoryView() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const size = 20;

  const { rows, isLoading, error, pageMeta, retry } = useAIGenerationsHistory(
    accessToken,
    page,
    size
  );

  const handleBackClick = useCallback(() => {
    navigate("/decks");
  }, [navigate]);

  const handlePageChange = useCallback((nextPage: number) => {
    setPage(nextPage);
  }, []);

  const handleRetry = useCallback(() => {
    retry();
  }, [retry]);

  const handleRowClick = useCallback((generationId: number) => {
    navigate(`/ai/review/${generationId}`);
  }, [navigate]);

  return (
    <ProtectedRoute>
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <AIGenerationsHistoryHeader onBackClick={handleBackClick} />

          {/* Loading state */}
          {isLoading && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Ładowanie historii generowań...</p>
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
          {!isLoading && !error && rows.length === 0 && (
            <AIGenerationsHistoryEmptyState onBackClick={handleBackClick} />
          )}

          {/* Table */}
          {!isLoading && !error && rows.length > 0 && (
            <div className="space-y-4">
              <AIGenerationsHistoryTable rows={rows} onRowClick={handleRowClick} />

              {/* Pagination */}
              {pageMeta && (
                <PaginationControls
                  page={pageMeta}
                  isLoading={isLoading}
                  onPageChange={handlePageChange}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
