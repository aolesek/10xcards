import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RotateCcw } from "lucide-react";

interface StudySummaryProps {
  totalCards: number;
  onRestart: () => void;
  onBackToDeck: () => void;
}

export function StudySummary({ totalCards, onRestart, onBackToDeck }: StudySummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Koniec sesji</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-muted-foreground">
          Przejrzano <span className="font-medium text-foreground">{totalCards}</span> fiszek.
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" onClick={onRestart} className="sm:flex-1">
            <RotateCcw className="h-4 w-4" />
            Powtórz
          </Button>
          <Button type="button" variant="outline" onClick={onBackToDeck} className="sm:flex-1">
            Wróć do talii
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

