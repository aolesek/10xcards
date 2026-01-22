import { Button } from "@/components/ui/button";

interface AIGenerationHeaderProps {
  total: number;
  acceptedCount: number;
  editedCount: number;
  rejectedCount: number;
  deckId: string | null;
  isSaving: boolean;
  onSave: () => void;
}

export function AIGenerationHeader({
  total,
  acceptedCount,
  editedCount,
  rejectedCount,
  deckId,
  isSaving,
  onSave,
}: AIGenerationHeaderProps) {
  const acceptedOrEditedCount = acceptedCount + editedCount;
  const isDisabled = isSaving || acceptedOrEditedCount === 0 || !deckId;

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Przegląd kandydatów</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>Wszystkich: {total}</span>
          <span className="text-green-600 dark:text-green-400">
            Do zapisania: {acceptedOrEditedCount}
          </span>
          {editedCount > 0 && (
            <span className="text-blue-600 dark:text-blue-400">
              (w tym edytowanych: {editedCount})
            </span>
          )}
          {rejectedCount > 0 && (
            <span className="text-muted-foreground">
              Odrzuconych: {rejectedCount}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          onClick={onSave}
          disabled={isDisabled}
          className="w-full sm:w-auto"
        >
          {isSaving ? "Zapisywanie..." : "Zapisz do talii"}
        </Button>
        {acceptedOrEditedCount === 0 && !isSaving && (
          <p className="text-xs text-muted-foreground">
            Wszystkie kandydaci zostali odrzuceni
          </p>
        )}
        {!deckId && (
          <p className="text-xs text-destructive">
            Talia została usunięta – nie można zapisać fiszek
          </p>
        )}
      </div>
    </div>
  );
}
