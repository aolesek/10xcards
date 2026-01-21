import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyFlashcardsStateProps {
  onCreateClick: () => void;
  isDisabled?: boolean;
}

export function EmptyFlashcardsState({
  onCreateClick,
  isDisabled = false,
}: EmptyFlashcardsStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold">Brak fiszek w tej talii</h3>
            <p className="text-muted-foreground">
              Dodaj swoją pierwszą fiszkę, aby rozpocząć naukę
            </p>
          </div>
          <Button onClick={onCreateClick} disabled={isDisabled}>
            Dodaj fiszkę
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
