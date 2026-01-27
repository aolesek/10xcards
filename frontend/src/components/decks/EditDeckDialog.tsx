import { useState, useEffect, useId } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { InlineError } from "@/components/auth/InlineError";
import { updateDeck } from "@/lib/api/decksApi";
import { handleApiError } from "@/lib/api/errorParser";
import type { DeckListItemVm, DeckResponseDto } from "@/lib/decks/deckTypes";

interface EditDeckDialogProps {
  open: boolean;
  deck: DeckListItemVm | null;
  accessToken: string;
  onOpenChange: (open: boolean) => void;
  onUpdated: (deck: DeckResponseDto) => void;
}

export function EditDeckDialog({
  open,
  deck,
  accessToken,
  onOpenChange,
  onUpdated,
}: EditDeckDialogProps) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const nameId = useId();
  const errorId = useId();

  // Prefill form when deck changes or dialog opens
  useEffect(() => {
    if (open && deck) {
      setName(deck.name);
      setNameError(null);
      setFormError(null);
      setIsSubmitting(false);
    }
  }, [open, deck]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setName("");
      setNameError(null);
      setFormError(null);
      setIsSubmitting(false);
    }
  }, [open]);

  // Clear field error when user types
  const handleNameChange = (value: string) => {
    setName(value);
    if (nameError) {
      setNameError(null);
    }
  };

  // Client-side validation
  const validateName = (value: string): string | null => {
    const trimmed = value.trim();
    
    if (trimmed.length === 0) {
      return "Nazwa talii jest wymagana";
    }
    
    if (trimmed.length > 100) {
      return "Nazwa talii może mieć maksymalnie 100 znaków";
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!deck) return;
    
    // Clear previous errors
    setNameError(null);
    setFormError(null);
    
    // Client-side validation
    const validationError = validateName(name);
    if (validationError) {
      setNameError(validationError);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const updatedDeck = await updateDeck(deck.id, {
        name: name.trim(),
      });
      
      onUpdated(updatedDeck);
      onOpenChange(false);
    } catch (error) {
      const { fieldErrors, globalError } = handleApiError(error);
      
      if (fieldErrors.name) {
        setNameError(fieldErrors.name);
      }
      
      if (globalError) {
        setFormError(globalError);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!deck) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edytuj talię</DialogTitle>
          <DialogDescription>
            Zmień nazwę talii "{deck.name}"
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {formError && <InlineError message={formError} />}
            
            <div className="space-y-2">
              <Label htmlFor={nameId}>Nazwa talii</Label>
              <Input
                id={nameId}
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="np. Angielski - podstawy"
                disabled={isSubmitting}
                aria-invalid={!!nameError}
                aria-describedby={nameError ? errorId : undefined}
                autoFocus
              />
              {nameError && (
                <p id={errorId} className="text-sm text-destructive" role="alert">
                  {nameError}
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
