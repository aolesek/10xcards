import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { UserMenu } from "@/components/auth/UserMenu";

interface AIGenerationsHistoryHeaderProps {
  onBackClick: () => void;
}

export function AIGenerationsHistoryHeader({ onBackClick }: AIGenerationsHistoryHeaderProps) {
  return (
    <div className="space-y-4">
      {/* User menu */}
      <div className="flex justify-end">
        <UserMenu />
      </div>

      {/* Main header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Historia generowań AI</h1>
          <p className="text-muted-foreground">
            Lista wszystkich generowań AI dla Twojego konta
          </p>
        </div>
        <Button onClick={onBackClick} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Wróć do talii
        </Button>
      </div>
    </div>
  );
}
