"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SearchBarProps {
  defaultSearch?: string;
  defaultGrade?: string;
  defaultAtRisk?: string;
}

export function SearchBar({
  defaultSearch = "",
  defaultGrade = "",
  defaultAtRisk = "",
}: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const handleSearch = useDebouncedCallback((value: string) => {
    updateParams({ search: value });
  }, 300);

  const handleGrade = (value: string | null) => {
    updateParams({ grade: value === "all" || value === null ? "" : value });
  };

  const handleAtRisk = (value: string | null) => {
    updateParams({ atRisk: value === "all" || value === null ? "" : value });
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Input
        placeholder="Search by name…"
        defaultValue={defaultSearch}
        onChange={(e) => handleSearch(e.target.value)}
        className="max-w-xs"
      />
      <Select defaultValue={defaultGrade || "all"} onValueChange={handleGrade}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Grade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Grades</SelectItem>
          <SelectItem value="9">9th</SelectItem>
          <SelectItem value="10">10th</SelectItem>
          <SelectItem value="11">11th</SelectItem>
          <SelectItem value="12">12th</SelectItem>
        </SelectContent>
      </Select>
      <Select defaultValue={defaultAtRisk || "all"} onValueChange={handleAtRisk}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Students</SelectItem>
          <SelectItem value="true">At-Risk Only</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
