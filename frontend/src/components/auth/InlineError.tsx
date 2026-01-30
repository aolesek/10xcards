import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface InlineErrorProps {
  message: string | null;
  "data-testid"?: string;
}

export function InlineError({ message, "data-testid": dataTestId }: InlineErrorProps) {
  if (!message) return null;

  return (
    <Alert variant="destructive" role="alert" aria-live="assertive" data-testid={dataTestId}>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
