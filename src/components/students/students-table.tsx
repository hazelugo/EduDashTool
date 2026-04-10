import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { StudentRow } from "@/lib/students";

interface StudentsTableProps {
  students: StudentRow[];
}

const GRADE_LABEL: Record<number, string> = {
  9: "9th",
  10: "10th",
  11: "11th",
  12: "12th",
};

export function StudentsTable({ students }: StudentsTableProps) {
  if (students.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
        No students match your filters.
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
            <TableHead>Counselor</TableHead>
            <TableHead>At-Risk</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/dashboard/students/${student.id}`}
                  className="hover:underline"
                >
                  {student.lastName}, {student.firstName}
                </Link>
              </TableCell>
              <TableCell>
                {GRADE_LABEL[student.gradeLevel] ?? student.gradeLevel}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {student.counselorName ?? "—"}
              </TableCell>
              <TableCell>
                {student.isAtRisk && (
                  <Badge variant="destructive">At Risk</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
