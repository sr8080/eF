import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard, AuthCardSkeleton } from "@/components/auth/auth-card";
import { JoinCodeForm } from "@/components/leagues/join-league-views";

export const metadata: Metadata = { title: "Join a League" };

export default function JoinIndexPage() {
  return (
    <AuthCard
      title="Join a league"
      description="Enter an 8-character invite code or paste the invite link from your friend."
      footer={
        <>
          Want to start your own?{" "}
          <Link href="/leagues/new" className="font-medium text-primary hover:underline">
            Create a league
          </Link>
        </>
      }
    >
      <Suspense fallback={<AuthCardSkeleton />}>
        <JoinCodeForm />
      </Suspense>
    </AuthCard>
  );
}
