"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CheckCircle2, Users } from "lucide-react";
import { toast } from "sonner";
import { joinLeagueAction } from "@/lib/actions/league";
import { extractInviteCode, joinCodeFormSchema } from "@/lib/validations/league";
import type { LeagueInvitePreview } from "@/types/database";
import { FormAlert, SubmitButton, TextField } from "@/components/forms/form-fields";
import { Button } from "@/components/ui/button";
import { ArchivedBadge, LeagueLogo } from "./league-badges";

export function JoinLeagueCard({
  code,
  preview,
  isSignedIn,
  isAlreadyMember,
}: {
  code: string;
  preview: LeagueInvitePreview | null;
  isSignedIn: boolean;
  isAlreadyMember: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!preview) {
    return (
      <div className="space-y-4 text-center">
        <FormAlert>No league matches invite code {code}.</FormAlert>
        <p className="text-sm text-muted-foreground">
          Check with your league admin for a fresh invite link or try another code.
        </p>
        <Button asChild variant="outline" className="min-h-11 w-full">
          <Link href="/join">Try another code</Link>
        </Button>
      </div>
    );
  }

  function onJoin() {
    setError(null);
    startTransition(async () => {
      const result = await joinLeagueAction(code);
      if (result.ok && result.data) {
        toast.success(result.message ?? "Joined league.");
        router.push(`/leagues/${result.data.leagueId}`);
      } else if (!result.ok) {
        setError(result.error);
      }
    });
  }

  const returnPath = `/join/${encodeURIComponent(code)}`;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3.5 rounded-xl border bg-surface-2 p-4">
        <LeagueLogo name={preview.name} src={preview.logo_url} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-lg font-semibold">{preview.name}</h2>
            {preview.is_archived && <ArchivedBadge />}
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="size-4" />
            <span className="tabular">{preview.member_count}</span>
            <span>{preview.member_count === 1 ? "member" : "members"}</span>
          </p>
        </div>
      </div>

      {error && <FormAlert>{error}</FormAlert>}

      {isAlreadyMember ? (
        <div className="space-y-3">
          <FormAlert variant="success">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 shrink-0" />
              You’re already a member of this league.
            </span>
          </FormAlert>
          <Button asChild size="lg" className="w-full">
            <Link href={`/leagues/${preview.id}`}>
              Open league <ArrowRight />
            </Link>
          </Button>
        </div>
      ) : preview.is_archived ? (
        <div className="space-y-3">
          <FormAlert>This league is archived and no longer accepting new members.</FormAlert>
          <Button asChild variant="outline" className="min-h-11 w-full">
            <Link href={isSignedIn ? "/leagues" : "/"}>
              {isSignedIn ? "Back to My Leagues" : "Back to home"}
            </Link>
          </Button>
        </div>
      ) : isSignedIn ? (
        <Button type="button" size="lg" className="w-full" disabled={pending} onClick={onJoin}>
          {pending ? "Joining…" : "Join league"}
        </Button>
      ) : (
        <div className="space-y-2.5">
          <Button asChild size="lg" className="w-full">
            <Link href={`/login?next=${encodeURIComponent(returnPath)}`}>Sign in to join</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full">
            <Link href={`/register?next=${encodeURIComponent(returnPath)}`}>Create account</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

export function JoinCodeForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm({
    resolver: zodResolver(joinCodeFormSchema),
    defaultValues: { code: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    const code = extractInviteCode(values.code);
    startTransition(() => {
      router.push(`/join/${encodeURIComponent(code)}`);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <TextField
        label="Invite code or link"
        placeholder="e.g. ABCD2345 or https://…/join/ABCD2345"
        autoCapitalize="characters"
        spellCheck={false}
        description="Paste an 8-character code or full invite URL."
        error={errors.code?.message}
        {...form.register("code")}
      />
      <SubmitButton pending={pending} pendingLabel="Checking invite…">
        Continue
      </SubmitButton>
    </form>
  );
}
