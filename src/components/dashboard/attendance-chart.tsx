"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { AttendanceDataPoint } from "@/lib/dashboard";

interface AttendanceChartProps {
  data: AttendanceDataPoint[];
}

function formatWeek(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function AttendanceChart({ data }: AttendanceChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No attendance data for the last 30 days.
      </div>
    );
  }

  const formatted = data.map((d) => ({ ...d, week: formatWeek(d.week) }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={formatted} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="week" tick={{ fontSize: 12 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
        <Tooltip formatter={(value) => `${value}%`} />
        <Line
          type="monotone"
          dataKey="rate"
          strokeWidth={2}
          dot={{ r: 3 }}
          className="stroke-primary"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
