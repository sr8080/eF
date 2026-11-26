"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-header";

export default function LeaguesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageContainer>
      <div className="flex flex-col items-center rounded-xl border bg-card px-6 py-12 text-center">
        <div className="mb-4 grid size-12 place-items-center rounded-full bg-destructive/15 text-destructive">
          <TriangleAlert className="size-6" />
        </div>
        <h1 className="text-lg font-semibold">Couldn’t load leagues</h1>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          Something went wrong while fetching your leagues. Try again in a moment.
        </p>
        {error.digest && <p className="tabular mt-3 text-xs text-muted-foreground">Ref: {error.digest}</p>}
        <Button onClick={reset} className="mt-6 min-h-11 sm:min-h-9">
          Try again
        </Button>
      </div>
    </PageContainer>
  );
}
