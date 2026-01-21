import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { FlashcardSourceBadge } from "./FlashcardSourceBadge";
import type { FlashcardListItemVm } from "@/lib/flashcards/flashcardTypes";

interface FlashcardCardProps {
  item: FlashcardListItemVm;
  onEdit: (item: FlashcardListItemVm) => void;
  onDelete: (item: FlashcardListItemVm) => void;
}

export function FlashcardCard({ item, onEdit, onDelete }: FlashcardCardProps) {
  // Truncate text for preview
  const truncate = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Przód</p>
          <p className="font-medium line-clamp-2">{truncate(item.front, 100)}</p>
        </div>
        <FlashcardSourceBadge source={item.source} />
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Tył</p>
          <p className="text-sm line-clamp-3">{truncate(item.back, 150)}</p>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
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
      </CardFooter>
    </Card>
  );
}
