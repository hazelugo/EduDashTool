"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function StudentFilters({
  search,
  grade,
  course,
  riskLevel,
  courseOptions,
}: {
  search: string;
  grade: string;
  course: string;
  riskLevel: string;
  courseOptions: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Reset to page 1 when filters change
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const debouncedSearch = useDebouncedCallback((val: string) => {
    update("search", val);
  }, 350);

  return (
    <div className="flex flex-wrap gap-3">
      <Input
        key={search}
        placeholder="Search by name..."
        defaultValue={search}
        className="max-w-xs"
        onChange={(e) => debouncedSearch(e.target.value)}
      />

      <Select
        defaultValue={grade || "all"}
        onValueChange={(val) => update("grade", val ?? "")}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Grade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All grades</SelectItem>
          <SelectItem value="9">9th grade</SelectItem>
          <SelectItem value="10">10th grade</SelectItem>
          <SelectItem value="11">11th grade</SelectItem>
          <SelectItem value="12">12th grade</SelectItem>
        </SelectContent>
      </Select>

      <Select
        defaultValue={course || "all"}
        onValueChange={(val) => update("course", val ?? "")}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Course" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All courses</SelectItem>
          {courseOptions.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        defaultValue={riskLevel || "all"}
        onValueChange={(val) => update("riskLevel", val ?? "")}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All students</SelectItem>
          <SelectItem value="at-risk">At Risk</SelectItem>
          <SelectItem value="watch">Watch</SelectItem>
          <SelectItem value="on-track">On Track</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
