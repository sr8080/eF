import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { getLeagueInvitePreview } from "@/lib/leagues";
import { extractInviteCode } from "@/lib/validations/league";
import { createClient } from "@/lib/supabase/server";
import { AuthCard, AuthCardSkeleton } from "@/components/auth/auth-card";
import { JoinLeagueCard } from "@/components/leagues/join-league-views";

export const metadata: Metadata = { title: "League Invite" };

export default function JoinByCodePage({ params }: PageProps<"/join/[code]">) {
  return (
    <AuthCard
      title="You’re invited"
      description="Review the league details below before joining."
      footer={
        <Link href="/join" className="font-medium text-info hover:underline">
          Use a different invite code
        </Link>
      }
    >
      <Suspense fallback={<AuthCardSkeleton />}>
        <JoinByCodeContent params={params} />
      </Suspense>
    </AuthCard>
  );
}

async function JoinByCodeContent({
  params,
}: {
  params: PageProps<"/join/[code]">["params"];
}) {
  const { code: rawCode } = await params;
  const normalizedCode = extractInviteCode(decodeURIComponent(rawCode));

  const [user, preview] = await Promise.all([
    getCurrentUser(),
    getLeagueInvitePreview(normalizedCode),
  ]);

  let isAlreadyMember = false;
  if (user && preview) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("league_members")
      .select("id")
      .eq("league_id", preview.id)
      .eq("user_id", user.id)
      .maybeSingle();
    isAlreadyMember = Boolean(data);
  }

  return (
    <JoinLeagueCard
      code={normalizedCode || rawCode}
      preview={preview}
      isSignedIn={Boolean(user)}
      isAlreadyMember={isAlreadyMember}
    />
  );
}
