import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { AtRiskStudent } from "@/lib/dashboard";

interface AtRiskTableProps {
  students: AtRiskStudent[];
}

const GRADE_LABEL: Record<number, string> = {
  9: "9th",
  10: "10th",
  11: "11th",
  12: "12th",
};

function RiskBadge({ reasons }: { reasons: AtRiskStudent["riskReasons"] }) {
  if (reasons.length === 0) return null;
  if (reasons.length === 2) {
    return <Badge variant="destructive">Both</Badge>;
  }
  if (reasons[0] === "graduation") {
    return <Badge variant="secondary">Graduation</Badge>;
  }
  return <Badge variant="outline">Attendance</Badge>;
}

export function AtRiskTable({ students }: AtRiskTableProps) {
  if (students.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
        No at-risk students right now.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Grade</TableHead>
            <TableHead>Risk Reason</TableHead>
            <TableHead>Counselor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student.id}>
              <TableCell className="font-medium">
                {student.lastName}, {student.firstName}
              </TableCell>
              <TableCell>{GRADE_LABEL[student.gradeLevel] ?? student.gradeLevel}</TableCell>
              <TableCell>
                <RiskBadge reasons={student.riskReasons} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {student.counselorName ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
