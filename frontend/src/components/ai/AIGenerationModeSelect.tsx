import { Label } from "@/components/ui/label";
import { ModeInfoTooltip } from "./ModeInfoTooltip";
import type { AIGenerationMode, AIGenerationModeOptionVm } from "@/lib/ai/aiTypes";

interface AIGenerationModeSelectProps {
  value: AIGenerationMode | "";
  options: AIGenerationModeOptionVm[];
  disabled?: boolean;
  error?: string | null;
  onChange: (mode: AIGenerationMode) => void;
}

/**
 * Select dropdown for AI generation mode with info tooltip
 */
export function AIGenerationModeSelect({
  value,
  options,
  disabled = false,
  error = null,
  onChange,
}: AIGenerationModeSelectProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value as AIGenerationMode;
    onChange(selectedValue);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor="generationMode">Tryb generacji</Label>
        <ModeInfoTooltip />
      </div>
      <select
        id="generationMode"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        data-testid="generation-mode-select"
        className={`flex h-10 w-full rounded-md border ${
          error ? "border-destructive" : "border-input"
        } bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <option value="" disabled>
          Wybierz tryb generacji
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
