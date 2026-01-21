import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth/useAuth";
import { Button } from "@/components/ui/button";

export function DecksView() {
  const { user, logout } = useAuth();

  return (
    <ProtectedRoute>
      <div className="flex min-h-svh items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Decks</h1>
          <p className="text-muted-foreground">
            Witaj, {user?.email}! Jesteś zalogowany.
          </p>
          <div className="mt-4">
            <Button onClick={logout} variant="outline">
              Wyloguj się
            </Button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
