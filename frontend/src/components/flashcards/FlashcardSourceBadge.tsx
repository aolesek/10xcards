import type { FlashcardSourceVm } from "@/lib/flashcards/flashcardTypes";

interface FlashcardSourceBadgeProps {
  source: FlashcardSourceVm;
}

export function FlashcardSourceBadge({ source }: FlashcardSourceBadgeProps) {
  const getSourceConfig = (source: FlashcardSourceVm) => {
    switch (source) {
      case "manual":
        return {
          label: "Ręczne",
          className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        };
      case "ai":
        return {
          label: "AI",
          className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
        };
      case "ai-edited":
        return {
          label: "AI (edytowane)",
          className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
        };
    }
  };

  const config = getSourceConfig(source);

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
