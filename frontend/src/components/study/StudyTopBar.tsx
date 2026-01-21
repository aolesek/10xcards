import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

interface StudyTopBarProps {
  deckName: string;
  progressText: string;
  onBackClick: () => void;
}

export function StudyTopBar({ deckName, progressText, onBackClick }: StudyTopBarProps) {
  return (
    <header className="flex items-center justify-between gap-3">
      <Button variant="ghost" onClick={onBackClick} className="-ml-2">
        <ChevronLeft className="h-4 w-4" />
        Wróć
      </Button>

      <div className="min-w-0 flex-1 text-center">
        <h1 className="truncate text-base font-semibold sm:text-lg">{deckName}</h1>
      </div>

      <div className="shrink-0 text-sm text-muted-foreground tabular-nums">
        {progressText}
      </div>
    </header>
  );
}

