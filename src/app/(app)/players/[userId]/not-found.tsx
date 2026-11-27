import Link from "next/link";
import { UserX } from "lucide-react";
import { PageContainer } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";

export default function PlayerNotFound() {
  return (
    <PageContainer>
      <div className="flex flex-col items-center rounded-xl border bg-card px-6 py-12 text-center">
        <div className="mb-4 grid size-12 place-items-center rounded-full bg-secondary text-muted-foreground">
          <UserX className="size-6" />
        </div>
        <h1 className="text-xl font-semibold">Player not found</h1>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          This player profile doesn’t exist.
        </p>
        <Button asChild className="mt-6 min-h-11 sm:min-h-9">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </PageContainer>
  );
}
