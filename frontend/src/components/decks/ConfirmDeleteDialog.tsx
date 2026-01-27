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
import { deleteDeck } from "@/lib/api/decksApi";
import { getErrorMessage } from "@/lib/api/errorParser";
import { Loader2 } from "lucide-react";
import type { DeckListItemVm } from "@/lib/decks/deckTypes";

interface ConfirmDeleteDialogProps {
  open: boolean;
  deck: DeckListItemVm | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: (deckId: string) => void;
}

export function ConfirmDeleteDialog({
  open,
  deck,
  onOpenChange,
  onDeleted,
}: ConfirmDeleteDialogProps) {
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
    if (!deck) return;
    
    setError(null);
    setIsDeleting(true);
    
    try {
      await deleteDeck(deck.id);
      onDeleted(deck.id);
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  if (!deck) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Czy na pewno chcesz usunąć tę talię?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Talia <strong>"{deck.name}"</strong> zostanie trwale usunięta wraz ze wszystkimi
              fiszkami ({deck.flashcardCount}).
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
            Usuń talię
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
