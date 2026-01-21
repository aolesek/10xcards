import { Button } from "@/components/ui/button";

interface DecksHeaderProps {
  onCreateClick: () => void;
  isDisabled?: boolean;
}

export function DecksHeader({ onCreateClick, isDisabled }: DecksHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Moje talie</h1>
        <p className="text-muted-foreground">
          Zarządzaj swoimi taliami i ucz się nowych rzeczy
        </p>
      </div>
      <Button onClick={onCreateClick} disabled={isDisabled}>
        Utwórz talię
      </Button>
    </div>
  );
}
