import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AIGenerationHistoryRowVm } from "@/lib/ai/aiTypes";

interface AIGenerationsHistoryTableProps {
  rows: AIGenerationHistoryRowVm[];
  onRowClick?: (generationId: number) => void;
}

export function AIGenerationsHistoryTable({ rows, onRowClick }: AIGenerationsHistoryTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Model AI</TableHead>
            <TableHead>Hash tekstu</TableHead>
            <TableHead className="text-right">Długość tekstu</TableHead>
            <TableHead className="text-right">Wygenerowane</TableHead>
            <TableHead className="text-right">Zaakceptowane/Edytowane</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow 
              key={row.id}
              onClick={() => onRowClick?.(row.id)}
              className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
            >
              <TableCell className="font-medium">{row.createdAtLabel}</TableCell>
              <TableCell>{row.aiModel}</TableCell>
              <TableCell>
                <span title={row.sourceTextHash} className="font-mono text-sm">
                  {row.sourceTextHashShort}
                </span>
              </TableCell>
              <TableCell className="text-right">{row.sourceTextLength}</TableCell>
              <TableCell className="text-right">{row.generatedCandidatesCount}</TableCell>
              <TableCell className="text-right">
                {row.acceptedOrEditedCandidatesCount !== null
                  ? row.acceptedOrEditedCandidatesCount
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
