import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { UserMenu } from "@/components/auth/UserMenu";

interface DecksHeaderProps {
  onCreateClick: () => void;
  onAiGenerateClick: () => void;
  isDisabled?: boolean;
}

export function DecksHeader({ onCreateClick, onAiGenerateClick, isDisabled }: DecksHeaderProps) {
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
        <div className="flex gap-2">
          <Button onClick={onAiGenerateClick} disabled={isDisabled} variant="outline">
            <Sparkles className="mr-2 h-4 w-4" />
            Generuj fiszki (AI)
          </Button>
          <Button onClick={onCreateClick} disabled={isDisabled}>
            Utwórz talię
          </Button>
        </div>
      </div>
    </div>
  );
}
