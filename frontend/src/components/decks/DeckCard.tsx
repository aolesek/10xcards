import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DeckListItemVm } from "@/lib/decks/deckTypes";

interface DeckCardProps {
  item: DeckListItemVm;
  onOpen: (deckId: string) => void;
  onStudy: (deckId: string) => void;
  onEdit: (item: DeckListItemVm) => void;
  onDelete: (item: DeckListItemVm) => void;
}

export function DeckCard({
  item,
  onOpen,
  onStudy,
  onEdit,
  onDelete,
}: DeckCardProps) {
  return (
    <Card data-testid="deck-card">
      <CardHeader>
        <CardTitle className="line-clamp-2 leading-tight">{item.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Fiszki: {item.flashcardCount}
        </p>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <div className="flex w-full gap-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={() => onStudy(item.id)}
          >
            Ucz się
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onOpen(item.id)}
          >
            Otwórz
          </Button>
        </div>
        <div className="flex w-full gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={() => onEdit(item)}
          >
            Edytuj
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-destructive hover:text-destructive"
            onClick={() => onDelete(item)}
          >
            Usuń
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
