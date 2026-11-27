"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Archive,
  CalendarDays,
  Check,
  CheckCircle2,
  Pencil,
  Play,
  Plus,
  Trophy,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  archiveSeasonAction,
  completeSeasonAction,
  createSeasonAction,
  setSeasonParticipantsAction,
  startSeasonAction,
  updateSeasonNameAction,
} from "@/lib/actions/season";
import { seasonFormSchema } from "@/lib/validations/season";
import type { LeagueMemberWithProfile } from "@/lib/leagues";
import type { LeagueSeasonWithRoster } from "@/lib/seasons";
import { applyServerErrors } from "@/lib/forms";
import { FormAlert, SubmitButton, TextField } from "@/components/forms/form-fields";
import { EmptyState } from "@/components/layout/page-header";
import { UserAvatar } from "@/components/user/user-avatar";
import { formatShortDate } from "@/components/leagues/league-badges";
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
import { cn } from "@/lib/utils";
import { SeasonStatusBadge } from "./season-badges";

export function SeasonsManager({
  leagueId,
  isManager,
  isArchived,
  leagueMembers,
  seasons,
}: {
  leagueId: string;
  isManager: boolean;
  isArchived: boolean;
  leagueMembers: LeagueMemberWithProfile[];
  seasons: LeagueSeasonWithRoster[];
}) {
  const hasActiveSeason = seasons.some((s) => s.season.status === "active");

  return (
    <div className="space-y-6">
      {isManager && !isArchived && (
        <CreateSeasonCard
          leagueId={leagueId}
          nextNumber={(seasons[0]?.season.number ?? 0) + 1}
          leagueMembers={leagueMembers}
        />
      )}

      {seasons.length === 0 ? (
        <EmptyState
          icon={<CalendarDays />}
          title="No seasons yet"
          description={
            isManager
              ? "Create your first season and pick which league members are competing."
              : "A league manager hasn’t set up a season yet."
          }
        />
      ) : (
        <div className="space-y-4">
          {seasons.map((entry) => (
            <SeasonCard
              key={entry.season.id}
              leagueId={leagueId}
              entry={entry}
              isManager={isManager}
              isLeagueArchived={isArchived}
              hasOtherActiveSeason={hasActiveSeason && entry.season.status !== "active"}
              leagueMembers={leagueMembers}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CreateSeasonCard({
  leagueId,
  nextNumber,
  leagueMembers,
}: {
  leagueId: string;
  nextNumber: number;
  leagueMembers: LeagueMemberWithProfile[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    leagueMembers.map((m) => m.userId),
  );

  const form = useForm({
    resolver: zodResolver(seasonFormSchema),
    defaultValues: { name: `Season ${nextNumber}` },
  });
  const { errors } = form.formState;

  function toggleMember(userId: string) {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await createSeasonAction(leagueId, values, selectedIds);
      if (result.ok) {
        toast.success(result.message ?? "Season created.");
        form.reset({ name: `Season ${nextNumber + 1}` });
        router.refresh();
      } else {
        setFormError(result.error);
        applyServerErrors(result, form.setError);
      }
    });
  });

  return (
    <section className="rounded-xl border bg-card p-4 sm:p-5" aria-labelledby="new-season-heading">
      <div className="mb-4 flex items-center gap-2">
        <Plus className="size-4 text-primary" />
        <h2 id="new-season-heading" className="font-semibold">
          Create season
        </h2>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <FormAlert>{formError}</FormAlert>

        <TextField
          label="Season name"
          placeholder={`e.g. Season ${nextNumber}`}
          description="Starts as a draft so you can finalize the roster before kicking off."
          error={errors.name?.message}
          {...form.register("name")}
        />

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-sm font-medium">
              Participants (<span className="tabular">{selectedIds.length}</span>/{leagueMembers.length})
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="text-xs font-medium text-info hover:underline"
                onClick={() => setSelectedIds(leagueMembers.map((m) => m.userId))}
              >
                Select all
              </button>
              <button
                type="button"
                className="text-xs font-medium text-muted-foreground hover:underline"
                onClick={() => setSelectedIds([])}
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {leagueMembers.map((m) => {
              const checked = selectedIds.includes(m.userId);
              return (
                <button
                  key={m.userId}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => toggleMember(m.userId)}
                  className={cn(
                    "flex min-h-11 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    checked
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "bg-surface-2 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <UserAvatar
                      name={m.profile.display_name}
                      src={m.profile.avatar_url}
                      size="sm"
                    />
                    <span className="truncate font-medium">{m.profile.display_name}</span>
                  </span>
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded border",
                      checked ? "border-primary bg-primary text-primary-foreground" : "border-input",
                    )}
                  >
                    {checked && <Check className="size-3.5" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <SubmitButton pending={pending} pendingLabel="Creating season…" className="sm:w-auto">
          Create draft season
        </SubmitButton>
      </form>
    </section>
  );
}

function SeasonCard({
  leagueId,
  entry,
  isManager,
  isLeagueArchived,
  hasOtherActiveSeason,
  leagueMembers,
}: {
  leagueId: string;
  entry: LeagueSeasonWithRoster;
  isManager: boolean;
  isLeagueArchived: boolean;
  hasOtherActiveSeason: boolean;
  leagueMembers: LeagueMemberWithProfile[];
}) {
  const router = useRouter();
  const { season, participants, champion } = entry;
  const [pending, startTransition] = useTransition();
  const [editingRoster, setEditingRoster] = useState(false);
  const [rosterIds, setRosterIds] = useState<string[]>(() => participants.map((p) => p.id));
  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(season.name);
  const [championId, setChampionId] = useState<string>(participants[0]?.id ?? "");

  const canManageSeason = isManager && !isLeagueArchived;
  const canEditRoster = canManageSeason && (season.status === "draft" || season.status === "active");
  const canRename = canManageSeason && season.status !== "archived";

  function toggleRosterUser(userId: string) {
    setRosterIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  function handleSaveRoster() {
    startTransition(async () => {
      const result = await setSeasonParticipantsAction(leagueId, season.id, rosterIds);
      if (result.ok) {
        toast.success(result.message ?? "Roster updated.");
        setEditingRoster(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateSeasonNameAction(leagueId, season.id, { name: nameInput });
      if (result.ok) {
        toast.success(result.message ?? "Season renamed.");
        setRenaming(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleStart() {
    startTransition(async () => {
      const result = await startSeasonAction(leagueId, season.id);
      if (result.ok) {
        toast.success(result.message ?? "Season started.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleComplete() {
    startTransition(async () => {
      const result = await completeSeasonAction(leagueId, season.id, championId || null);
      if (result.ok) {
        toast.success(result.message ?? "Season completed.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveSeasonAction(leagueId, season.id);
      if (result.ok) {
        toast.success(result.message ?? "Season archived.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <article className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {renaming ? (
            <form onSubmit={handleSaveName} className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={nameInput}
                maxLength={60}
                onChange={(e) => setNameInput(e.target.value)}
                disabled={pending}
                aria-label="Season name"
                className="h-10 min-w-[200px] rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <Button type="submit" size="sm" className="min-h-10" disabled={pending}>
                Save
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-10"
                onClick={() => {
                  setNameInput(season.name);
                  setRenaming(false);
                }}
              >
                Cancel
              </Button>
            </form>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="tabular text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                #{season.number}
              </span>
              <h3 className="text-lg font-semibold">{season.name}</h3>
              <SeasonStatusBadge status={season.status} />
              {canRename && (
                <button
                  type="button"
                  onClick={() => {
                    setNameInput(season.name);
                    setRenaming(true);
                  }}
                  aria-label="Rename season"
                  className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <Pencil className="size-3.5" />
                </button>
              )}
            </div>
          )}

          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" />
              <span className="tabular">{participants.length}</span>{" "}
              {participants.length === 1 ? "player" : "players"}
            </span>
            {season.started_at && (
              <span>
                Started <span className="tabular">{formatShortDate(season.started_at)}</span>
              </span>
            )}
            {season.ended_at && (
              <span>
                Ended <span className="tabular">{formatShortDate(season.ended_at)}</span>
              </span>
            )}
          </p>
        </div>

        {canManageSeason && (
          <div className="flex flex-wrap gap-2">
            {canEditRoster && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 sm:min-h-8"
                disabled={pending}
                onClick={() => {
                  setRosterIds(participants.map((p) => p.id));
                  setEditingRoster((v) => !v);
                }}
              >
                <Users /> {editingRoster ? "Close roster" : "Edit roster"}
              </Button>
            )}

            {season.status === "draft" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    className="min-h-11 sm:min-h-8"
                    disabled={pending || participants.length < 2 || hasOtherActiveSeason}
                    title={
                      hasOtherActiveSeason
                        ? "Complete or archive the active season first"
                        : participants.length < 2
                          ? "Add at least 2 participants to start"
                          : undefined
                    }
                  >
                    <Play /> Start season
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Start {season.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This marks the season as active with {participants.length} enrolled players. Only one season can be active at a time.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleStart}>Start season</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {season.status === "active" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="min-h-11 sm:min-h-8"
                    disabled={pending}
                  >
                    <CheckCircle2 /> Complete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Complete {season.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Lock the roster and mark this season as completed. Optionally crown a champion below.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-1.5">
                    <label htmlFor={`champ-${season.id}`} className="text-xs font-medium text-muted-foreground">
                      Champion (optional)
                    </label>
                    <select
                      id={`champ-${season.id}`}
                      value={championId}
                      onChange={(e) => setChampionId(e.target.value)}
                      className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <option value="">No champion selected</option>
                      {participants.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.display_name} (@{p.username})
                        </option>
                      ))}
                    </select>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleComplete}>Complete season</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {season.status !== "archived" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="min-h-11 text-muted-foreground sm:min-h-8"
                    disabled={pending}
                  >
                    <Archive /> Archive
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Archive {season.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Archived seasons are read-only and kept for historical records.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={handleArchive}>
                      Archive season
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}
      </div>

      {champion && (
        <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
          <Trophy className="size-3.5" />
          Champion:{" "}
          <Link href={`/players/${champion.id}`} className="underline-offset-2 hover:underline">
            {champion.display_name}
          </Link>
        </div>
      )}

      {editingRoster ? (
        <div className="mt-4 space-y-3 rounded-lg border bg-surface-2 p-3.5">
          <p className="text-xs font-medium text-muted-foreground">
            Select league members competing in {season.name}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {leagueMembers.map((m) => {
              const checked = rosterIds.includes(m.userId);
              return (
                <button
                  key={m.userId}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => toggleRosterUser(m.userId)}
                  className={cn(
                    "flex min-h-11 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    checked
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <UserAvatar
                      name={m.profile.display_name}
                      src={m.profile.avatar_url}
                      size="sm"
                    />
                    <span className="truncate font-medium">{m.profile.display_name}</span>
                  </span>
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded border",
                      checked ? "border-primary bg-primary text-primary-foreground" : "border-input",
                    )}
                  >
                    {checked && <Check className="size-3.5" />}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" className="min-h-10" disabled={pending} onClick={handleSaveRoster}>
              Save roster ({rosterIds.length})
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-10"
              disabled={pending}
              onClick={() => setEditingRoster(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : participants.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {participants.map((p) => (
            <Link
              key={p.id}
              href={`/players/${p.id}`}
              className="inline-flex min-h-9 items-center gap-2 rounded-full border bg-surface-2 px-2.5 py-1 text-xs font-medium transition-colors hover:border-primary/40 hover:text-primary"
            >
              <UserAvatar name={p.display_name} src={p.avatar_url} size="sm" />
              <span>{p.display_name}</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          No participants added yet.
          {canEditRoster && " Click Edit roster to enroll league members."}
        </p>
      )}
    </article>
  );
}
