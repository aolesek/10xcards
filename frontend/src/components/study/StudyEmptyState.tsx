import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StudyEmptyStateProps {
  onBackToDeck: () => void;
  onBackToDecksList?: () => void;
}

export function StudyEmptyState({ onBackToDeck, onBackToDecksList }: StudyEmptyStateProps) {
  return (
    <Card data-testid="study-empty-state">
      <CardHeader>
        <CardTitle>Brak fiszek</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-muted-foreground">Ta talia nie ma jeszcze fiszek.</p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" onClick={onBackToDeck} className="sm:flex-1">
            Wróć i dodaj fiszki
          </Button>
          {onBackToDecksList && (
            <Button
              type="button"
              variant="outline"
              onClick={onBackToDecksList}
              className="sm:flex-1"
            >
              Wróć do listy talii
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

