import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DeckHeaderProps {
  deckName: string;
  flashcardCount: number;
  onCreateClick: () => void;
  onStudyClick: () => void;
  isDisabled?: boolean;
}

export function DeckHeader({
  deckName,
  flashcardCount,
  onCreateClick,
  onStudyClick,
  isDisabled = false,
}: DeckHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/decks")}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Powrót do talii
      </Button>
      
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{deckName}</h1>
          <p className="text-muted-foreground">
            Fiszki: {flashcardCount}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onCreateClick} disabled={isDisabled} variant="outline">
            Dodaj fiszkę
          </Button>
          <Button onClick={onStudyClick} disabled={isDisabled || flashcardCount === 0}>
            Ucz się
          </Button>
        </div>
      </div>
    </div>
  );
}
