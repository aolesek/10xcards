import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AIGenerationsHistoryEmptyStateProps {
  onBackClick: () => void;
}

export function AIGenerationsHistoryEmptyState({ onBackClick }: AIGenerationsHistoryEmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold">Nie masz jeszcze żadnych generowań AI</h3>
            <p className="text-muted-foreground">
              Przejdź do generowania fiszek, aby utworzyć swoje pierwsze generowanie AI
            </p>
          </div>
          <Button onClick={onBackClick} variant="outline">
            Wróć do talii
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
