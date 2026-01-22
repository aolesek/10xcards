import { CandidateCard } from "./CandidateCard";
import type { CandidateVm } from "@/lib/ai/aiTypes";

interface CandidateGridProps {
  candidates: CandidateVm[];
  isUpdatingIds: Set<string>;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onEditRequest: (candidate: CandidateVm) => void;
}

export function CandidateGrid({
  candidates,
  isUpdatingIds,
  onAccept,
  onReject,
  onEditRequest,
}: CandidateGridProps) {
  if (candidates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          Wszystkie kandydaci zostali odrzuceni.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {candidates.map((candidate) => (
        <CandidateCard
          key={candidate.id}
          candidate={candidate}
          isUpdating={isUpdatingIds.has(candidate.id)}
          onAccept={onAccept}
          onReject={onReject}
          onEdit={onEditRequest}
        />
      ))}
    </div>
  );
}
