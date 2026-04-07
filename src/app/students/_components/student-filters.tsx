"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
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
  atRisk,
}: {
  search: string;
  grade: string;
  atRisk: string;
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
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Input
        placeholder="Search by name…"
        defaultValue={search}
        className="max-w-xs"
        onChange={(e) => {
          const val = e.target.value;
          clearTimeout((window as unknown as Record<string, ReturnType<typeof setTimeout>>)["_studentSearchTimer"]);
          (window as unknown as Record<string, ReturnType<typeof setTimeout>>)["_studentSearchTimer"] = setTimeout(() => update("search", val), 350);
        }}
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
        defaultValue={atRisk || "all"}
        onValueChange={(val) => update("atRisk", val ?? "")}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All students</SelectItem>
          <SelectItem value="true">At-risk only</SelectItem>
          <SelectItem value="false">On track only</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
