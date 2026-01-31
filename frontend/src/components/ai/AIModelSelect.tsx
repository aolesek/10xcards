import { useId } from "react";
import { Label } from "@/components/ui/label";
import type { AIModelId, AIModelOptionVm } from "@/lib/ai/aiModels";

interface AIModelSelectProps {
  value: AIModelId | "";
  options: AIModelOptionVm[];
  disabled?: boolean;
  error?: string | null;
  onChange: (model: AIModelId) => void;
}

export function AIModelSelect({
  value,
  options,
  disabled = false,
  error = null,
  onChange,
}: AIModelSelectProps) {
  const selectId = useId();
  const errorId = useId();

  return (
    <div className="space-y-2">
      <Label htmlFor={selectId}>Model AI</Label>
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value as AIModelId)}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        data-testid="ai-model-select"
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        Wybierz model AI do generowania fiszek
      </p>
    </div>
  );
}
