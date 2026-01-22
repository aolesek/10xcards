import { Button } from "@/components/ui/button";
import { ChevronLeft, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/useAuth";

interface StudyTopBarProps {
  deckName: string;
  progressText: string;
  onBackClick: () => void;
}

export function StudyTopBar({ deckName, progressText, onBackClick }: StudyTopBarProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="space-y-3">
      {/* Top bar with logout */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Wyloguj</span>
        </Button>
      </div>

      {/* Study header */}
      <header className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBackClick} className="-ml-2">
          <ChevronLeft className="h-4 w-4" />
          Wróć
        </Button>

        <div className="min-w-0 flex-1 text-center">
          <h1 className="truncate text-base font-semibold sm:text-lg">{deckName}</h1>
        </div>

        <div className="shrink-0 text-sm text-muted-foreground tabular-nums">
          {progressText}
        </div>
      </header>
    </div>
  );
}

