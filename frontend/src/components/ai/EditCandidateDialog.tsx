import { useState, useId, useRef, useEffect } from "react";
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
import type { CandidateVm } from "@/lib/ai/aiTypes";

interface EditCandidateDialogProps {
  open: boolean;
  candidate: CandidateVm | null;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    candidateId: string,
    editedFront: string,
    editedBack: string
  ) => void;
}

export function EditCandidateDialog({
  open,
  candidate,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: EditCandidateDialogProps) {
  const [editedFront, setEditedFront] = useState("");
  const [editedBack, setEditedBack] = useState("");
  const [frontError, setFrontError] = useState<string | null>(null);
  const [backError, setBackError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const frontId = useId();
  const backId = useId();
  const frontErrorId = useId();
  const backErrorId = useId();

  // Track previous open state to detect dialog state changes
  const prevOpenRef = useRef(open);
  const prevCandidateRef = useRef(candidate);

  // Update form when dialog opens with a candidate
  useEffect(() => {
    const wasOpened = !prevOpenRef.current && open;
    const wasClosed = prevOpenRef.current && !open;
    const candidateChanged = prevCandidateRef.current !== candidate;

    if (wasOpened && candidate) {
      // Dialog just opened - prefill form using queueMicrotask to avoid cascading renders
      queueMicrotask(() => {
        setEditedFront(candidate.editedFront || candidate.front);
        setEditedBack(candidate.editedBack || candidate.back);
        setFrontError(null);
        setBackError(null);
        setFormError(null);
      });
    } else if (wasClosed) {
      // Dialog just closed - reset form
      queueMicrotask(() => {
        setEditedFront("");
        setEditedBack("");
        setFrontError(null);
        setBackError(null);
        setFormError(null);
      });
    } else if (open && candidateChanged && candidate) {
      // Candidate changed while dialog is open
      queueMicrotask(() => {
        setEditedFront(candidate.editedFront || candidate.front);
        setEditedBack(candidate.editedBack || candidate.back);
        setFrontError(null);
        setBackError(null);
        setFormError(null);
      });
    }

    prevOpenRef.current = open;
    prevCandidateRef.current = candidate;
  }, [open, candidate]);

  // Clear field error when user types
  const handleFrontChange = (value: string) => {
    setEditedFront(value);
    if (frontError) {
      setFrontError(null);
    }
    if (formError) {
      setFormError(null);
    }
  };

  const handleBackChange = (value: string) => {
    setEditedBack(value);
    if (backError) {
      setBackError(null);
    }
    if (formError) {
      setFormError(null);
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

  const handleSubmitInternal = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!candidate) return;

    // Clear previous errors
    setFrontError(null);
    setBackError(null);
    setFormError(null);

    // Client-side validation
    const frontValidationError = validateFront(editedFront);
    const backValidationError = validateBack(editedBack);

    if (frontValidationError || backValidationError) {
      setFrontError(frontValidationError);
      setBackError(backValidationError);
      return;
    }

    // Call parent submit handler
    onSubmit(candidate.id, editedFront.trim(), editedBack.trim());
  };

  const frontCharCount = editedFront.trim().length;
  const backCharCount = editedBack.trim().length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edytuj kandydata</DialogTitle>
          <DialogDescription>
            Zmień zawartość przodu lub tyłu fiszki przed zapisaniem do talii
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmitInternal}>
          <div className="space-y-4">
            {formError && <InlineError message={formError} />}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={frontId}>Przód fiszki</Label>
                <span
                  className={`text-xs ${
                    frontCharCount > 500
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {frontCharCount}/500
                </span>
              </div>
              <Textarea
                id={frontId}
                value={editedFront}
                onChange={(e) => handleFrontChange(e.target.value)}
                placeholder="np. What is your name?"
                disabled={isSubmitting}
                aria-invalid={!!frontError}
                aria-describedby={frontError ? frontErrorId : undefined}
                autoFocus
                rows={3}
              />
              {frontError && (
                <p
                  id={frontErrorId}
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {frontError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={backId}>Tył fiszki</Label>
                <span
                  className={`text-xs ${
                    backCharCount > 500
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {backCharCount}/500
                </span>
              </div>
              <Textarea
                id={backId}
                value={editedBack}
                onChange={(e) => handleBackChange(e.target.value)}
                placeholder="np. Jak masz na imię?"
                disabled={isSubmitting}
                aria-invalid={!!backError}
                aria-describedby={backError ? backErrorId : undefined}
                rows={3}
              />
              {backError && (
                <p
                  id={backErrorId}
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {backError}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <LoadingButton isLoading={isSubmitting}>
              Zapisz zmiany
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
