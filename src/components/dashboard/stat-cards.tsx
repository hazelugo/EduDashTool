import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, AlertTriangle, CalendarCheck, GraduationCap } from "lucide-react";
import type { SchoolStats } from "@/lib/dashboard";

interface StatCardsProps {
  stats: SchoolStats;
}

const cards = (stats: SchoolStats) => [
  {
    title: "Total Students",
    value: stats.totalStudents,
    icon: Users,
  },
  {
    title: "At-Risk Students",
    value: stats.totalAtRisk,
    icon: AlertTriangle,
  },
  {
    title: "Attendance Rate",
    value: stats.attendanceRate !== null ? `${stats.attendanceRate}%` : "—",
    icon: CalendarCheck,
  },
  {
    title: "Avg GPA",
    value: stats.avgGpa !== null ? stats.avgGpa : "—",
    icon: GraduationCap,
  },
];

export function StatCards({ stats }: StatCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards(stats).map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
