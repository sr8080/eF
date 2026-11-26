"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, RefreshCw, Share2 } from "lucide-react";
import { toast } from "sonner";
import { env } from "@/lib/env";
import { regenerateInviteCodeAction } from "@/lib/actions/league";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const emptySubscribe = () => () => {};

export function InvitePanel({
  leagueId,
  leagueName,
  initialCode,
  canManage,
  isArchived,
}: {
  leagueId: string;
  leagueName: string;
  initialCode: string;
  canManage: boolean;
  isArchived: boolean;
}) {
  const router = useRouter();
  const [overrideCode, setOverrideCode] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<"code" | "link" | null>(null);
  const [pending, startTransition] = useTransition();

  const canShare = useSyncExternalStore(
    emptySubscribe,
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false,
  );

  const code = overrideCode ?? initialCode;
  const inviteUrl = `${env.siteUrl}/join/${code}`;

  async function copyText(value: string, type: "code" | "link") {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedType(type);
      toast.success(type === "link" ? "Invite link copied." : "Invite code copied.");
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  }

  async function onNativeShare() {
    try {
      await navigator.share({
        title: `Join ${leagueName}`,
        text: `Join ${leagueName} on eFootball League Hub (code: ${code})`,
        url: inviteUrl,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      toast.error("Could not open share sheet.");
    }
  }

  function onRegenerate() {
    startTransition(async () => {
      const result = await regenerateInviteCodeAction(leagueId);
      if (result.ok && result.data) {
        setOverrideCode(result.data.code);
        toast.success(result.message ?? "Invite code regenerated.");
        router.refresh();
      } else if (!result.ok) {
        toast.error(result.error);
      }
    });
  }

  return (
    <section className="rounded-xl border bg-card p-4 sm:p-5" aria-labelledby="invite-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="invite-heading" className="font-semibold">
            Invite players
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {isArchived
              ? "This league is archived and no longer accepting new members."
              : "Share the code or link with friends to let them join."}
          </p>
        </div>

        {canManage && !isArchived && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" disabled={pending} className="min-h-11 sm:min-h-8">
                <RefreshCw className={pending ? "animate-spin" : ""} />
                Regenerate
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Regenerate invite code?</AlertDialogTitle>
                <AlertDialogDescription>
                  The current invite link and code will stop working immediately. Existing members stay in the league.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onRegenerate}>Regenerate</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-lg border bg-surface-2 p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Invite code</p>
          <p className="tabular mt-0.5 text-2xl font-semibold tracking-[0.2em] text-primary">
            {code}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 flex-1 sm:flex-initial"
            onClick={() => copyText(code, "code")}
            disabled={isArchived}
          >
            {copiedType === "code" ? <Check className="text-primary" /> : <Copy />}
            Copy code
          </Button>
          <Button
            type="button"
            variant="default"
            className="min-h-11 flex-1 sm:flex-initial"
            onClick={() => copyText(inviteUrl, "link")}
            disabled={isArchived}
          >
            {copiedType === "link" ? <Check /> : <Copy />}
            Copy link
          </Button>
          {canShare && !isArchived && (
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={onNativeShare}
            >
              <Share2 />
              Share
            </Button>
          )}
        </div>
      </div>

      <p className="mt-2.5 truncate text-xs text-muted-foreground">
        Link: <span className="font-mono text-foreground/80">{inviteUrl}</span>
      </p>
    </section>
  );
}
