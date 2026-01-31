import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { InlineError } from "@/components/auth/InlineError";
import { DeckSelect } from "./DeckSelect";
import { AIModelSelect } from "./AIModelSelect";
import { AIGenerationModeSelect } from "./AIGenerationModeSelect";
import { TextareaWithCounter } from "./TextareaWithCounter";
import type {
  AIGenerateFormVm,
  AIGenerateFormErrorsVm,
  DeckOptionVm,
  AIGenerationMode,
  AIGenerationModeOptionVm,
} from "@/lib/ai/aiTypes";
import type { AIModelId, AIModelOptionVm } from "@/lib/ai/aiModels";

interface AIGenerateFormProps {
  form: AIGenerateFormVm;
  errors: AIGenerateFormErrorsVm;
  deckOptions: DeckOptionVm[];
  modelOptions: AIModelOptionVm[];
  modeOptions: AIGenerationModeOptionVm[];
  isDecksLoading: boolean;
  isSubmitting: boolean;
  onDeckChange: (deckId: string) => void;
  onModelChange: (model: AIModelId) => void;
  onModeChange: (mode: AIGenerationMode) => void;
  onSourceTextChange: (value: string) => void;
  onRequestedCandidatesCountChange: (value: number) => void;
  onOpenCreateDeckDialog: () => void;
  onSubmit: () => void;
}

export function AIGenerateForm({
  form,
  errors,
  deckOptions,
  modelOptions,
  modeOptions,
  isDecksLoading,
  isSubmitting,
  onDeckChange,
  onModelChange,
  onModeChange,
  onSourceTextChange,
  onRequestedCandidatesCountChange,
  onOpenCreateDeckDialog,
  onSubmit,
}: AIGenerateFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numValue = value === "" ? 0 : parseInt(value, 10);
    onRequestedCandidatesCountChange(isNaN(numValue) ? 0 : numValue);
  };

  const isDisabled = isDecksLoading || isSubmitting;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.formError && <InlineError message={errors.formError} />}

      {/* Deck selection */}
      <div className="space-y-3">
        <DeckSelect
          value={form.deckId}
          options={deckOptions}
          disabled={isDisabled}
          error={errors.deckId}
          onChange={onDeckChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpenCreateDeckDialog}
          disabled={isDisabled}
          data-testid="create-deck-button"
        >
          Utwórz nową talię
        </Button>
      </div>

      {/* Generation mode selection */}
      <AIGenerationModeSelect
        value={form.mode}
        options={modeOptions}
        disabled={isDisabled}
        error={errors.mode}
        onChange={onModeChange}
      />

      {/* AI Model selection */}
      <AIModelSelect
        value={form.model}
        options={modelOptions}
        disabled={isDisabled}
        error={errors.model}
        onChange={onModelChange}
      />

      {/* Source text */}
      <TextareaWithCounter
        value={form.sourceText}
        disabled={isDisabled}
        error={errors.sourceText}
        onChange={onSourceTextChange}
      />

      {/* Requested candidates count */}
      <div className="space-y-2">
        <Label htmlFor="requestedCandidatesCount">
          Liczba fiszek
        </Label>
        <Input
          id="requestedCandidatesCount"
          type="number"
          min={1}
          max={100}
          step={1}
          value={form.requestedCandidatesCount}
          onChange={handleCountChange}
          disabled={isDisabled}
          data-testid="flashcard-count-input"
          className={errors.requestedCandidatesCount ? "border-destructive" : ""}
        />
        {errors.requestedCandidatesCount && (
          <p className="text-sm text-destructive" role="alert">
            {errors.requestedCandidatesCount}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Domyślnie 10, maksymalnie 100
        </p>
      </div>

      {/* Submit button */}
      <div className="flex justify-end">
        <LoadingButton isLoading={isSubmitting} disabled={isDecksLoading}>
          Generuj
        </LoadingButton>
      </div>
    </form>
  );
}
