import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { InlineError } from "@/components/auth/InlineError";
import { DeckSelect } from "./DeckSelect";
import { TextareaWithCounter } from "./TextareaWithCounter";
import type {
  AIGenerateFormVm,
  AIGenerateFormErrorsVm,
  DeckOptionVm,
} from "@/lib/ai/aiTypes";

interface AIGenerateFormProps {
  form: AIGenerateFormVm;
  errors: AIGenerateFormErrorsVm;
  deckOptions: DeckOptionVm[];
  isDecksLoading: boolean;
  isSubmitting: boolean;
  onDeckChange: (deckId: string) => void;
  onSourceTextChange: (value: string) => void;
  onOpenCreateDeckDialog: () => void;
  onSubmit: () => void;
}

export function AIGenerateForm({
  form,
  errors,
  deckOptions,
  isDecksLoading,
  isSubmitting,
  onDeckChange,
  onSourceTextChange,
  onOpenCreateDeckDialog,
  onSubmit,
}: AIGenerateFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
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

      {/* Source text */}
      <TextareaWithCounter
        value={form.sourceText}
        disabled={isDisabled}
        error={errors.sourceText}
        onChange={onSourceTextChange}
      />

      {/* Submit button */}
      <div className="flex justify-end">
        <LoadingButton isLoading={isSubmitting} disabled={isDecksLoading}>
          Generuj
        </LoadingButton>
      </div>
    </form>
  );
}
