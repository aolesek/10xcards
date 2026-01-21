import { FlashcardCard } from "./FlashcardCard";
import type { FlashcardListItemVm } from "@/lib/flashcards/flashcardTypes";

interface FlashcardListProps {
  items: FlashcardListItemVm[];
  onEdit: (item: FlashcardListItemVm) => void;
  onDelete: (item: FlashcardListItemVm) => void;
}

export function FlashcardList({ items, onEdit, onDelete }: FlashcardListProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <FlashcardCard
          key={item.id}
          item={item}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
