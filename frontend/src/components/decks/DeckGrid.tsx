import { DeckCard } from "./DeckCard";
import type { DeckListItemVm } from "@/lib/decks/deckTypes";

interface DeckGridProps {
  items: DeckListItemVm[];
  onOpen: (deckId: string) => void;
  onStudy: (deckId: string) => void;
  onEdit: (item: DeckListItemVm) => void;
  onDelete: (item: DeckListItemVm) => void;
}

export function DeckGrid({
  items,
  onOpen,
  onStudy,
  onEdit,
  onDelete,
}: DeckGridProps) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <DeckCard
          key={item.id}
          item={item}
          onOpen={onOpen}
          onStudy={onStudy}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
