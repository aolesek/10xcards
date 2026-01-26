import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PageMetaDto } from "@/lib/ai/aiTypes";

interface PaginationControlsProps {
  page: PageMetaDto;
  isLoading: boolean;
  onPageChange: (nextPage: number) => void;
}

export function PaginationControls({ page, isLoading, onPageChange }: PaginationControlsProps) {
  const isPrevDisabled = page.number === 0 || isLoading;
  const isNextDisabled = page.number + 1 >= page.totalPages || isLoading;

  const handlePrev = () => {
    if (!isPrevDisabled) {
      onPageChange(page.number - 1);
    }
  };

  const handleNext = () => {
    if (!isNextDisabled) {
      onPageChange(page.number + 1);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        Strona {page.number + 1} z {page.totalPages} ({page.totalElements} elementów)
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrev}
          disabled={isPrevDisabled}
        >
          <ChevronLeft className="h-4 w-4" />
          Poprzednia
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={isNextDisabled}
        >
          Następna
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
