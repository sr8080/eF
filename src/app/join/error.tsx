"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function JoinError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border bg-card px-6 py-10 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-full bg-destructive/15 text-destructive">
        <TriangleAlert className="size-6" />
      </div>
      <h1 className="text-lg font-semibold">Couldn’t load invite</h1>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        Check your connection and try again.
      </p>
      {error.digest && <p className="tabular mt-3 text-xs text-muted-foreground">Ref: {error.digest}</p>}
      <Button onClick={reset} className="mt-6 min-h-11 sm:min-h-9">
        Try again
      </Button>
    </div>
  );
}
