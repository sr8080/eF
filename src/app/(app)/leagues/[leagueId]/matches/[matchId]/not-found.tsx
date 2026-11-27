import Link from "next/link";
import { CalendarX2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MatchNotFound() {
  return (
    <div className="flex flex-col items-center rounded-xl border bg-card px-6 py-12 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-full bg-secondary text-muted-foreground">
        <CalendarX2 className="size-6" />
      </div>
      <h1 className="text-xl font-semibold">Match not found</h1>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        This fixture doesn’t exist in this league.
      </p>
      <Button asChild className="mt-6 min-h-11 sm:min-h-9">
        <Link href="/leagues">Back to My Leagues</Link>
      </Button>
    </div>
  );
}
