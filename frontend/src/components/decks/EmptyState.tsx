import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  onCreateClick: () => void;
}

export function EmptyState({ onCreateClick }: EmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold">Nie masz jeszcze żadnych talii</h3>
            <p className="text-muted-foreground">
              Utwórz swoją pierwszą talię, aby rozpocząć naukę
            </p>
          </div>
          <Button onClick={onCreateClick}>
            Utwórz pierwszą talię
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
