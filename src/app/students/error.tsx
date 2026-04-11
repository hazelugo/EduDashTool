"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function StudentsError({ error, reset }: ErrorProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("Students error:", error);
    }
    // In production, rely on error.digest for server-side error correlation
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      <p className="text-sm text-muted-foreground">
        Something went wrong loading students.
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground font-mono">digest: {error.digest}</p>
      )}
      <Button variant="outline" size="sm" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
