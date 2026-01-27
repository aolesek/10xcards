import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { InlineError } from "@/components/auth/InlineError";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  StudyCard,
  StudyControls,
  StudyEmptyState,
  StudyLayout,
  StudySummary,
  StudyTopBar,
} from "@/components/study";
import { Button } from "@/components/ui/button";
import { getStudySession } from "@/lib/api/decksApi";
import { getErrorMessage } from "@/lib/api/errorParser";
import { ApiError } from "@/lib/api/httpClient";
import { useAuth } from "@/lib/auth/useAuth";
import type { StudySessionResponseDto } from "@/lib/study/studyTypes";

export function StudyView() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { accessToken, logout } = useAuth();

  const [session, setSession] = useState<StudySessionResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [mode, setMode] = useState<"loading" | "error" | "empty" | "in-progress" | "summary">(
    "loading"
  );

  const totalCards = session?.totalCards ?? 0;

  const progressText = useMemo(() => {
    if (!session || totalCards === 0) return "";
    if (mode === "summary") return `${totalCards} / ${totalCards}`;
    return `${currentIndex + 1} / ${totalCards}`;
  }, [currentIndex, mode, session, totalCards]);

  const currentCard = useMemo(() => {
    if (!session) return null;
    return session.flashcards[currentIndex] ?? null;
  }, [currentIndex, session]);

  const resetInProgressState = useCallback(() => {
    setCurrentIndex(0);
    setIsRevealed(false);
  }, []);

  const fetchSession = useCallback(async () => {
    if (!deckId) {
      setError("Nieprawidłowy identyfikator talii.");
      setIsLoading(false);
      setMode("error");
      return;
    }

    if (!accessToken) {
      setError("Brak tokenu autoryzacji. Zaloguj się ponownie.");
      setIsLoading(false);
      setMode("error");
      return;
    }

    setIsLoading(true);
    setError(null);
    setMode("loading");

    try {
      const data = await getStudySession(deckId, { shuffle: true });
      setSession(data);

      if (data.totalCards === 0) {
        setMode("empty");
      } else {
        resetInProgressState();
        setMode("in-progress");
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Sesja wygasła. Zaloguj się ponownie.");
        logout();
        return;
      }

      if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
        setError("Nie znaleziono talii lub nie masz do niej dostępu.");
        setMode("error");
        return;
      }

      setError(getErrorMessage(err));
      setMode("error");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, deckId, logout, resetInProgressState]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const handleBackToDeck = useCallback(() => {
    if (!deckId) {
      navigate("/decks");
      return;
    }
    navigate(`/decks/${deckId}`);
  }, [deckId, navigate]);

  const handleBackToDecksList = useCallback(() => {
    navigate("/decks");
  }, [navigate]);

  const handleToggleReveal = useCallback(() => {
    if (mode !== "in-progress") return;
    setIsRevealed((v) => !v);
  }, [mode]);

  const handlePrev = useCallback(() => {
    if (mode !== "in-progress") return;
    setCurrentIndex((idx) => {
      const next = Math.max(0, idx - 1);
      return next;
    });
    setIsRevealed(false);
  }, [mode]);

  const handleNext = useCallback(() => {
    if (mode !== "in-progress") return;
    if (!session) return;

    if (currentIndex >= session.totalCards - 1) {
      setMode("summary");
      return;
    }

    setCurrentIndex((idx) => Math.min(session.totalCards - 1, idx + 1));
    setIsRevealed(false);
  }, [currentIndex, mode, session]);

  const handleRestart = useCallback(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      return (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target.isContentEditable
      );
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (mode !== "in-progress") return;
      if (isEditableTarget(e.target)) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (currentIndex > 0) handlePrev();
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        // On the last card, "next" transitions to summary
        if (session) handleNext();
        return;
      }

      if (e.key === " " || e.key === "Enter") {
        // Space scrolls the page by default
        e.preventDefault();
        handleToggleReveal();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentIndex, handleNext, handlePrev, handleToggleReveal, mode, session]);

  return (
    <ProtectedRoute>
      <StudyLayout>
        {/* Top bar */}
        <StudyTopBar
          deckName={session?.deckName ?? "Nauka"}
          progressText={progressText}
          onBackClick={handleBackToDeck}
        />

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-muted-foreground">Ładowanie...</p>
          </div>
        )}

        {/* Error */}
        {!isLoading && mode === "error" && (
          <div className="space-y-4">
            <InlineError message={error} />
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button type="button" variant="outline" onClick={fetchSession}>
                Spróbuj ponownie
              </Button>
              <Button type="button" variant="ghost" onClick={handleBackToDecksList}>
                Wróć do listy talii
              </Button>
            </div>
          </div>
        )}

        {/* Empty deck */}
        {!isLoading && mode === "empty" && (
          <StudyEmptyState
            onBackToDeck={handleBackToDeck}
            onBackToDecksList={handleBackToDecksList}
          />
        )}

        {/* In-progress */}
        {!isLoading && mode === "in-progress" && session && currentCard && (
          <div className="flex flex-1 flex-col gap-6">
            <StudyCard
              card={currentCard}
              isRevealed={isRevealed}
              onToggleReveal={handleToggleReveal}
            />
            <StudyControls
              canGoPrev={currentIndex > 0}
              // "Następna" on the last card transitions to summary (see handleNext)
              canGoNext={true}
              isRevealed={isRevealed}
              onPrev={handlePrev}
              onNext={handleNext}
              onToggleReveal={handleToggleReveal}
            />
          </div>
        )}

        {/* Summary */}
        {!isLoading && mode === "summary" && session && (
          <StudySummary
            totalCards={totalCards}
            onRestart={handleRestart}
            onBackToDeck={handleBackToDeck}
          />
        )}
      </StudyLayout>
    </ProtectedRoute>
  );
}

