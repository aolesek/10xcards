import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { InlineError } from "@/components/auth/InlineError";
import { deleteFlashcard } from "@/lib/api/flashcardsApi";
import { getErrorMessage } from "@/lib/api/errorParser";
import { Loader2 } from "lucide-react";
import type { FlashcardListItemVm } from "@/lib/flashcards/flashcardTypes";

interface ConfirmDeleteFlashcardDialogProps {
  open: boolean;
  flashcard: FlashcardListItemVm | null;
  accessToken: string;
  onOpenChange: (open: boolean) => void;
  onDeleted: (flashcardId: string) => void;
}

export function ConfirmDeleteFlashcardDialog({
  open,
  flashcard,
  accessToken,
  onOpenChange,
  onDeleted,
}: ConfirmDeleteFlashcardDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setIsDeleting(false);
      setError(null);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!flashcard) return;
    
    setError(null);
    setIsDeleting(true);
    
    try {
      await deleteFlashcard(flashcard.id);
      onDeleted(flashcard.id);
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  if (!flashcard) return null;

  // Truncate text for display
  const truncate = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Czy na pewno chcesz usunąć tę fiszkę?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Fiszka z przodu <strong>"{truncate(flashcard.front, 50)}"</strong> zostanie trwale usunięta.
            </p>
            <p className="text-destructive font-medium">
              Ta operacja jest nieodwracalna.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {error && (
          <div className="mt-2">
            <InlineError message={error} />
          </div>
        )}
        
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Anuluj
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Usuń fiszkę
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
