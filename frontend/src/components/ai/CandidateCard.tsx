import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, Pencil } from "lucide-react";
import type { CandidateVm } from "@/lib/ai/aiTypes";

interface CandidateCardProps {
  candidate: CandidateVm;
  isUpdating: boolean;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onEdit: (candidate: CandidateVm) => void;
}

export function CandidateCard({
  candidate,
  isUpdating,
  onAccept,
  onReject,
  onEdit,
}: CandidateCardProps) {
  const isAccepted = candidate.status === "accepted";
  const isEdited = candidate.status === "edited";
  const isPending = candidate.status === "pending";

  const statusBadgeClass = isAccepted
    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
    : isEdited
      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";

  const statusText = isAccepted
    ? "Zaakceptowana"
    : isEdited
      ? "Edytowana"
      : "Oczekująca";

  return (
    <Card
      className={`transition-all ${
        isAccepted
          ? "border-green-300 dark:border-green-800"
          : isEdited
            ? "border-blue-300 dark:border-blue-800"
            : ""
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Kandydat</CardTitle>
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${statusBadgeClass}`}
          >
            {statusText}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Front */}
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            Przód
          </div>
          <div className="rounded-md bg-muted p-3 text-sm">
            {candidate.displayFront}
          </div>
          {isEdited && candidate.editedFront !== candidate.front && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Oryginał:</span> {candidate.front}
            </div>
          )}
        </div>

        {/* Back */}
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            Tył
          </div>
          <div className="rounded-md bg-muted p-3 text-sm">
            {candidate.displayBack}
          </div>
          {isEdited && candidate.editedBack !== candidate.back && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Oryginał:</span> {candidate.back}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {isPending && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAccept(candidate.id)}
              disabled={isUpdating}
              className="flex-1"
            >
              <Check className="mr-1 h-4 w-4" />
              Akceptuj
            </Button>
          )}
          {(isAccepted || isEdited) && (
            <div className="flex flex-1 items-center justify-center gap-1 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-green-600" />
              <span>Zaakceptowano</span>
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(candidate)}
            disabled={isUpdating}
            className="flex-1"
          >
            <Pencil className="mr-1 h-4 w-4" />
            Edytuj
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onReject(candidate.id)}
            disabled={isUpdating}
            className="flex-1"
          >
            <X className="mr-1 h-4 w-4" />
            Odrzuć
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
