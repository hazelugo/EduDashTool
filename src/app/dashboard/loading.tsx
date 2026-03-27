import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Page heading */}
      <div className="space-y-1">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-40" />
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>

      {/* At-risk table */}
      <Skeleton className="h-64 rounded-xl" />

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Skeleton className="h-52 rounded-xl" />
        <Skeleton className="h-52 rounded-xl" />
      </div>
    </div>
  );
}
