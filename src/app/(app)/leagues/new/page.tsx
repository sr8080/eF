import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { CreateLeagueForm } from "@/components/leagues/create-league-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Create League" };

export default function NewLeaguePage() {
  return (
    <PageContainer className="max-w-xl">
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/leagues">
            <ArrowLeft /> Back to leagues
          </Link>
        </Button>
      </div>

      <PageHeader
        eyebrow="New League"
        title="Create a league"
        description="Set up your league and get an invite link for your friends."
      />

      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <NewLeagueContent />
      </Suspense>
    </PageContainer>
  );
}

async function NewLeagueContent() {
  await requireUser("/leagues/new");

  return (
    <div className="rounded-xl border bg-card p-4 sm:p-6">
      <CreateLeagueForm />
    </div>
  );
}
