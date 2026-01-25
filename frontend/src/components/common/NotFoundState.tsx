import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { NotFoundStateProps } from "@/lib/notFound/notFoundTypes";

/**
 * Presentational component for 404 Not Found state
 * Displays a user-friendly message with navigation options
 */
export function NotFoundState({
  title,
  description,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  isPrimaryDisabled = false,
}: NotFoundStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              onClick={onPrimaryAction}
              disabled={isPrimaryDisabled}
              className="sm:min-w-[200px]"
            >
              {primaryActionLabel}
            </Button>

            {secondaryActionLabel && onSecondaryAction && (
              <Button
                variant="outline"
                onClick={onSecondaryAction}
                className="sm:min-w-[200px]"
              >
                {secondaryActionLabel}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
