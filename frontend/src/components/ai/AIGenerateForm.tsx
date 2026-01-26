import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { InlineError } from "@/components/auth/InlineError";
import { DeckSelect } from "./DeckSelect";
import { AIModelSelect } from "./AIModelSelect";
import { TextareaWithCounter } from "./TextareaWithCounter";
import type {
  AIGenerateFormVm,
  AIGenerateFormErrorsVm,
  DeckOptionVm,
} from "@/lib/ai/aiTypes";
import type { AIModelId, AIModelOptionVm } from "@/lib/ai/aiModels";

interface AIGenerateFormProps {
  form: AIGenerateFormVm;
  errors: AIGenerateFormErrorsVm;
  deckOptions: DeckOptionVm[];
  modelOptions: AIModelOptionVm[];
  isDecksLoading: boolean;
  isSubmitting: boolean;
  onDeckChange: (deckId: string) => void;
  onModelChange: (model: AIModelId) => void;
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
  isDecksLoading,
  isSubmitting,
  onDeckChange,
  onModelChange,
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
        >
          Utwórz nową talię
        </Button>
      </div>

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
