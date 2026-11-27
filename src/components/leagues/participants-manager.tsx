"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  leaveLeagueAction,
  removeMemberAction,
  setMemberRoleAction,
} from "@/lib/actions/league";
import type { LeagueMemberWithProfile } from "@/lib/leagues";
import type { LeagueRole } from "@/types/database";
import { UserAvatar } from "@/components/user/user-avatar";
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
import { RoleBadge, formatShortDate } from "./league-badges";

export function ParticipantsManager({
  leagueId,
  currentUserId,
  currentUserRole,
  isArchived,
  members,
}: {
  leagueId: string;
  currentUserId: string;
  currentUserRole: LeagueRole;
  isArchived: boolean;
  members: LeagueMemberWithProfile[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const isOwner = currentUserRole === "owner";
  const isManager = currentUserRole === "owner" || currentUserRole === "admin";

  function handleRoleChange(userId: string, nextRole: "admin" | "player") {
    startTransition(async () => {
      const result = await setMemberRoleAction(leagueId, userId, nextRole);
      if (result.ok) {
        toast.success(result.message ?? "Role updated.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleRemove(userId: string) {
    startTransition(async () => {
      const result = await removeMemberAction(leagueId, userId);
      if (result.ok) {
        toast.success(result.message ?? "Member removed.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleLeave() {
    startTransition(async () => {
      const result = await leaveLeagueAction(leagueId);
      if (result.ok) {
        toast.success(result.message ?? "You left the league.");
        router.push("/leagues");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="divide-y rounded-xl border bg-card">
        {members.map((member) => {
          const isSelf = member.userId === currentUserId;
          const canChangeRole = isOwner && !isArchived && member.role !== "owner";
          const canRemove =
            !isArchived &&
            !isSelf &&
            isManager &&
            member.role !== "owner" &&
            (isOwner || member.role === "player");

          return (
            <div
              key={member.id}
              className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Link href={`/players/${member.userId}`} className="shrink-0">
                  <UserAvatar
                    name={member.profile.display_name}
                    src={member.profile.avatar_url}
                    size="default"
                  />
                </Link>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/players/${member.userId}`}
                      className="truncate font-medium hover:text-primary"
                    >
                      {member.profile.display_name}
                    </Link>
                    {isSelf && (
                      <span className="text-xs font-normal text-muted-foreground">(you)</span>
                    )}
                    <RoleBadge role={member.role} />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    @{member.profile.username} · Joined{" "}
                    <span className="tabular">{formatShortDate(member.joinedAt)}</span>
                  </p>
                </div>
              </div>

              {(canChangeRole || canRemove) && (
                <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                  {canChangeRole && member.role === "player" && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="min-h-11 sm:min-h-8"
                      disabled={pending}
                      onClick={() => handleRoleChange(member.userId, "admin")}
                    >
                      <ArrowUp /> Make admin
                    </Button>
                  )}

                  {canChangeRole && member.role === "admin" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-11 sm:min-h-8"
                      disabled={pending}
                      onClick={() => handleRoleChange(member.userId, "player")}
                    >
                      <ArrowDown /> Demote
                    </Button>
                  )}

                  {canRemove && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="min-h-11 sm:min-h-8"
                          disabled={pending}
                        >
                          <Trash2 /> Remove
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Remove {member.profile.display_name}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            They will lose access to this league unless they rejoin with an invite code.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            variant="destructive"
                            onClick={() => handleRemove(member.userId)}
                          >
                            Remove member
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!isOwner && !isArchived && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-destructive/25 bg-card p-4">
          <div>
            <p className="font-medium">Leave league</p>
            <p className="text-sm text-muted-foreground">
              You can rejoin later if you have an active invite link.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" className="min-h-11 shrink-0" disabled={pending}>
                <LogOut /> Leave
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Leave this league?</AlertDialogTitle>
                <AlertDialogDescription>
                  You will be removed from the participant list until you rejoin.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={handleLeave}>
                  Leave league
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
