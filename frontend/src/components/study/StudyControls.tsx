import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";

interface StudyControlsProps {
  canGoPrev: boolean;
  canGoNext: boolean;
  isRevealed: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggleReveal: () => void;
}

export function StudyControls({
  canGoPrev,
  canGoNext,
  isRevealed,
  onPrev,
  onNext,
  onToggleReveal,
}: StudyControlsProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={onPrev}
        disabled={!canGoPrev}
        data-testid="study-prev-button"
      >
        <ChevronLeft className="h-4 w-4" />
        Poprzednia
      </Button>

      <Button 
        type="button" 
        variant="secondary" 
        size="lg" 
        onClick={onToggleReveal}
        data-testid="study-reveal-button"
      >
        {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        {isRevealed ? "Ukryj" : "Odsłoń"}
      </Button>

      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={onNext}
        disabled={!canGoNext}
        data-testid="study-next-button"
      >
        Następna
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

