import { useNavigate } from "react-router-dom";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/useAuth";

export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!user) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
        <User className="h-4 w-4" />
        <span>{user.email}</span>
      </div>
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
  );
}
