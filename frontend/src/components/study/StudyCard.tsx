import { Card, CardContent } from "@/components/ui/card";
import type { StudyFlashcardVm } from "@/lib/study/studyTypes";

interface StudyCardProps {
  card: StudyFlashcardVm;
  isRevealed: boolean;
  onToggleReveal: () => void;
}

export function StudyCard({ card, isRevealed, onToggleReveal }: StudyCardProps) {
  const label = isRevealed
    ? "Fiszka. Odpowiedź odsłonięta. Naciśnij aby ukryć."
    : "Fiszka. Odpowiedź ukryta. Naciśnij aby odsłonić.";

  return (
    <button
      type="button"
      onClick={onToggleReveal}
      className="text-left outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] rounded-xl"
      aria-label={label}
      data-testid="study-card"
    >
      <Card className="min-h-[280px] sm:min-h-[360px]">
        <CardContent className="flex h-full flex-col justify-center gap-4">
          {isRevealed ? (
            <>
              <div className="text-xs text-muted-foreground">Pytanie</div>
              <div className="text-base font-medium sm:text-lg" data-testid="card-question">{card.front}</div>
              <div className="pt-2 text-xs text-muted-foreground">Odpowiedź</div>
              <div className="text-base sm:text-lg" data-testid="card-answer">{card.back}</div>
            </>
          ) : (
            <>
              <div className="text-xs text-muted-foreground">Pytanie</div>
              <div className="text-base font-medium sm:text-lg" data-testid="card-question">{card.front}</div>
              <div className="pt-6 text-sm text-muted-foreground">
                Kliknij kartę lub naciśnij Space / Enter, aby odsłonić odpowiedź
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </button>
  );
}

