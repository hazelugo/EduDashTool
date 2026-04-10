"use client";

import { useRouter } from "next/navigation";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { RiskLevel } from "@/lib/students";

type StudentRowData = {
  id: string;
  firstName: string;
  lastName: string;
  gradeLevel: number;
  counselorName: string | null;
  riskLevel: RiskLevel;
};

const GRADE_LABEL: Record<number, string> = {
  9: "9th",
  10: "10th",
  11: "11th",
  12: "12th",
};

function RiskBadge({ riskLevel }: { riskLevel: RiskLevel }) {
  if (riskLevel === "at-risk") {
    return <Badge variant="destructive">At Risk</Badge>;
  }
  if (riskLevel === "watch") {
    return (
      <Badge
        variant="outline"
        className="border-yellow-500 text-yellow-700 dark:text-yellow-400"
      >
        Watch
      </Badge>
    );
  }
  return <Badge variant="secondary">On Track</Badge>;
}

export function StudentTableBody({ rows }: { rows: StudentRowData[] }) {
  const router = useRouter();

  return (
    <TableBody>
      {rows.map((student) => (
        <TableRow
          key={student.id}
          className="cursor-pointer hover:bg-muted/50"
          onClick={() => router.push(`/students/${student.id}`)}
        >
          <TableCell className="font-medium">
            {student.lastName}, {student.firstName}
          </TableCell>
          <TableCell>
            {GRADE_LABEL[student.gradeLevel] ?? student.gradeLevel}
          </TableCell>
          <TableCell className="text-muted-foreground">
            {student.counselorName ?? "\u2014"}
          </TableCell>
          <TableCell>
            <RiskBadge riskLevel={student.riskLevel} />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}
