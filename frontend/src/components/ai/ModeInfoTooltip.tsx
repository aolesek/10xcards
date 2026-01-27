import { Info } from "lucide-react";

interface ModeInfoTooltipProps {
  content?: string;
}

/**
 * Info icon with hover tooltip explaining generation modes
 * Uses CSS-based tooltip without external dependencies
 */
export function ModeInfoTooltip({ content }: ModeInfoTooltipProps) {
  const defaultContent = `
    • Przyswajanie wiedzy: AI tworzy fiszki na podstawie całego tekstu.
    
    • Nauka języka (A1–C2): AI wybiera słowa trudniejsze niż wskazany poziom CEFR i tworzy fiszki: słowo → definicja (w języku słowa) + tłumaczenie na polski.
    
    Liczba fiszek określa maksymalny limit kandydatów do wygenerowania.
  `.trim();

  return (
    <div className="group relative inline-block">
      <Info
        className="h-4 w-4 cursor-help text-muted-foreground hover:text-foreground transition-colors"
        aria-describedby="mode-tooltip"
      />
      <div
        id="mode-tooltip"
        role="tooltip"
        className="invisible group-hover:visible absolute left-1/2 bottom-full mb-2 -translate-x-1/2 w-80 rounded-md bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md border z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
      >
        <div className="whitespace-pre-line">{content || defaultContent}</div>
        <div className="absolute left-1/2 top-full -translate-x-1/2 -mt-px">
          <div className="border-4 border-transparent border-t-popover" />
        </div>
      </div>
    </div>
  );
}
