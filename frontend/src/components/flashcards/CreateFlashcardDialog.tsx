import { useState, useEffect, useId } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { InlineError } from "@/components/auth/InlineError";
import { createFlashcard } from "@/lib/api/flashcardsApi";
import { handleApiError } from "@/lib/api/errorParser";
import type { FlashcardResponseDto } from "@/lib/flashcards/flashcardTypes";

interface CreateFlashcardDialogProps {
  open: boolean;
  deckId: string;
  accessToken: string;
  onOpenChange: (open: boolean) => void;
  onCreated: (flashcard: FlashcardResponseDto) => void;
}

export function CreateFlashcardDialog({
  open,
  deckId,
  accessToken,
  onOpenChange,
  onCreated,
}: CreateFlashcardDialogProps) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [frontError, setFrontError] = useState<string | null>(null);
  const [backError, setBackError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const frontId = useId();
  const backId = useId();
  const frontErrorId = useId();
  const backErrorId = useId();

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setFront("");
      setBack("");
      setFrontError(null);
      setBackError(null);
      setFormError(null);
      setIsSubmitting(false);
    }
  }, [open]);

  // Clear field error when user types
  const handleFrontChange = (value: string) => {
    setFront(value);
    if (frontError) {
      setFrontError(null);
    }
  };

  const handleBackChange = (value: string) => {
    setBack(value);
    if (backError) {
      setBackError(null);
    }
  };

  // Client-side validation
  const validateFront = (value: string): string | null => {
    const trimmed = value.trim();
    
    if (trimmed.length === 0) {
      return "Przód fiszki jest wymagany";
    }
    
    if (trimmed.length > 500) {
      return "Przód fiszki może mieć maksymalnie 500 znaków";
    }
    
    return null;
  };

  const validateBack = (value: string): string | null => {
    const trimmed = value.trim();
    
    if (trimmed.length === 0) {
      return "Tył fiszki jest wymagany";
    }
    
    if (trimmed.length > 500) {
      return "Tył fiszki może mieć maksymalnie 500 znaków";
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setFrontError(null);
    setBackError(null);
    setFormError(null);
    
    // Client-side validation
    const frontValidationError = validateFront(front);
    const backValidationError = validateBack(back);
    
    if (frontValidationError || backValidationError) {
      setFrontError(frontValidationError);
      setBackError(backValidationError);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const flashcard = await createFlashcard(accessToken, deckId, {
        front: front.trim(),
        back: back.trim(),
      });
      
      onCreated(flashcard);
      onOpenChange(false);
    } catch (error) {
      const { fieldErrors, globalError } = handleApiError(error);
      
      if (fieldErrors.front) {
        setFrontError(fieldErrors.front);
      }
      
      if (fieldErrors.back) {
        setBackError(fieldErrors.back);
      }
      
      if (globalError) {
        setFormError(globalError);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dodaj nową fiszkę</DialogTitle>
          <DialogDescription>
            Wypełnij przód i tył fiszki
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {formError && <InlineError message={formError} />}
            
            <div className="space-y-2">
              <Label htmlFor={frontId}>Przód fiszki</Label>
              <Textarea
                id={frontId}
                value={front}
                onChange={(e) => handleFrontChange(e.target.value)}
                placeholder="np. What is your name?"
                disabled={isSubmitting}
                aria-invalid={!!frontError}
                aria-describedby={frontError ? frontErrorId : undefined}
                autoFocus
                rows={3}
              />
              {frontError && (
                <p id={frontErrorId} className="text-sm text-destructive" role="alert">
                  {frontError}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor={backId}>Tył fiszki</Label>
              <Textarea
                id={backId}
                value={back}
                onChange={(e) => handleBackChange(e.target.value)}
                placeholder="np. Jak masz na imię?"
                disabled={isSubmitting}
                aria-invalid={!!backError}
                aria-describedby={backError ? backErrorId : undefined}
                rows={3}
              />
              {backError && (
                <p id={backErrorId} className="text-sm text-destructive" role="alert">
                  {backError}
                </p>
              )}
            </div>
          </div>
          
          <DialogFooter className="mt-6">
            <LoadingButton isLoading={isSubmitting}>
              Dodaj fiszkę
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
