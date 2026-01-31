import { useId, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface TextareaWithCounterProps {
  value: string;
  disabled?: boolean;
  error?: string | null;
  min?: number; // default 500
  max?: number; // default 10000
  onChange: (value: string) => void;
}

export function TextareaWithCounter({
  value,
  disabled = false,
  error = null,
  min = 500,
  max = 10000,
  onChange,
}: TextareaWithCounterProps) {
  const textareaId = useId();
  const errorId = useId();
  const hintId = useId();

  // Calculate trimmed length for validation
  const trimmedLength = useMemo(() => value.trim().length, [value]);

  // Determine counter color
  const counterClass = useMemo(() => {
    if (trimmedLength < min || trimmedLength > max) {
      return "text-destructive";
    }
    return "text-muted-foreground";
  }, [trimmedLength, min, max]);

  return (
    <div className="space-y-2">
      <Label htmlFor={textareaId}>Tekst źródłowy</Label>
      <Textarea
        id={textareaId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Wklej tutaj tekst, z którego mają zostać wygenerowane fiszki..."
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : hintId}
        data-testid="source-text-input"
        className="min-h-[200px] resize-y"
      />
      <div className="flex items-center justify-between">
        <p id={hintId} className="text-sm text-muted-foreground">
          Wymagane: {min}–{max.toLocaleString()} znaków
        </p>
        <p className={`text-sm ${counterClass}`}>
          {trimmedLength.toLocaleString()} znaków
        </p>
      </div>
      {error && (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
