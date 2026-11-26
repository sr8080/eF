import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LeagueNotFound() {
  return (
    <div className="flex flex-col items-center rounded-xl border bg-card px-6 py-12 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-full bg-secondary text-muted-foreground">
        <ShieldAlert className="size-6" />
      </div>
      <h1 className="text-xl font-semibold">League not found</h1>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        This league doesn’t exist or you don’t have access to it.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button asChild className="min-h-11 sm:min-h-9">
          <Link href="/leagues">Back to My Leagues</Link>
        </Button>
        <Button asChild variant="outline" className="min-h-11 sm:min-h-9">
          <Link href="/join">Join with code</Link>
        </Button>
      </div>
    </div>
  );
}
