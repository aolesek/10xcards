import { Button } from "@/components/ui/button";
import { Sparkles, History } from "lucide-react";
import { UserMenu } from "@/components/auth/UserMenu";

interface DecksHeaderProps {
  onCreateClick: () => void;
  onAiGenerateClick: () => void;
  onAiGenerationsHistoryClick: () => void;
  isDisabled?: boolean;
}

export function DecksHeader({ 
  onCreateClick, 
  onAiGenerateClick, 
  onAiGenerationsHistoryClick,
  isDisabled 
}: DecksHeaderProps) {
  return (
    <div className="space-y-4">
      {/* User menu */}
      <div className="flex justify-end">
        <UserMenu />
      </div>

      {/* Main header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Moje talie</h1>
          <p className="text-muted-foreground">
            Zarządzaj swoimi taliami i ucz się nowych rzeczy
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={onAiGenerationsHistoryClick} 
            disabled={isDisabled} 
            variant="ghost"
          >
            <History className="mr-2 h-4 w-4" />
            Historia generowań AI
          </Button>
          <Button onClick={onAiGenerateClick} disabled={isDisabled} variant="outline" data-testid="ai-generate-button">
            <Sparkles className="mr-2 h-4 w-4" />
            Generuj fiszki (AI)
          </Button>
          <Button onClick={onCreateClick} disabled={isDisabled} data-testid="create-deck-button">
            Utwórz talię
          </Button>
        </div>
      </div>
    </div>
  );
}
