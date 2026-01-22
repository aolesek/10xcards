import { useId } from "react";
import { Label } from "@/components/ui/label";
import type { DeckOptionVm } from "@/lib/ai/aiTypes";

interface DeckSelectProps {
  value: string | "";
  options: DeckOptionVm[];
  disabled?: boolean;
  error?: string | null;
  onChange: (deckId: string) => void;
}

export function DeckSelect({
  value,
  options,
  disabled = false,
  error = null,
  onChange,
}: DeckSelectProps) {
  const selectId = useId();
  const errorId = useId();

  return (
    <div className="space-y-2">
      <Label htmlFor={selectId}>Docelowa talia</Label>
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">Wybierz talię...</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
            {option.flashcardCount !== undefined ? ` (${option.flashcardCount})` : ""}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
