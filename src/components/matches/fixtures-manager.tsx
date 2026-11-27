"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarPlus, Shuffle, Swords } from "lucide-react";
import { toast } from "sonner";
import {
  createMatchAction,
  generateFixturesAction,
} from "@/lib/actions/match";
import type { EnrichedMatch } from "@/lib/matches";
import type { LeagueSeasonWithRoster } from "@/lib/seasons";
import {
  createMatchSchema,
  generateFixturesSchema,
} from "@/lib/validations/match";
import { applyServerErrors } from "@/lib/forms";
import { FormAlert, SubmitButton, TextField } from "@/components/forms/form-fields";
import { EmptyState } from "@/components/layout/page-header";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { MatchCard } from "./match-card";

export function FixturesManager({
  leagueId,
  currentUserId,
  isManager,
  isLeagueArchived,
  seasons,
  matches,
  initialSeasonId,
}: {
  leagueId: string;
  currentUserId: string;
  isManager: boolean;
  isLeagueArchived: boolean;
  seasons: LeagueSeasonWithRoster[];
  matches: EnrichedMatch[];
  initialSeasonId: string;
}) {
  const [selectedSeasonId, setSelectedSeasonId] = useState(initialSeasonId);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "confirmed" | "cancelled">("all");
  const [openTool, setOpenTool] = useState<"none" | "generate" | "single">("none");

  const activeSeason = seasons.find((s) => s.season.id === selectedSeasonId) ?? seasons[0] ?? null;

  const seasonMatches = useMemo(() => {
    if (!activeSeason) return [];
    return matches.filter((m) => m.match.season_id === activeSeason.season.id);
  }, [matches, activeSeason]);

  const filteredMatches = useMemo(() => {
    return seasonMatches.filter((m) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "open") {
        return (
          m.displayStatus === "scheduled" ||
          m.displayStatus === "pending_result" ||
          m.displayStatus === "awaiting_confirmation" ||
          m.displayStatus === "disputed"
        );
      }
      return m.displayStatus === statusFilter;
    });
  }, [seasonMatches, statusFilter]);

  const groupedByRound = useMemo(() => {
    const groups = new Map<string, EnrichedMatch[]>();
    for (const m of filteredMatches) {
      const key = m.match.round !== null ? `Round ${m.match.round}` : "Unassigned round";
      const list = groups.get(key) ?? [];
      list.push(m);
      groups.set(key, list);
    }
    return Array.from(groups.entries());
  }, [filteredMatches]);

  if (seasons.length === 0 || !activeSeason) {
    return (
      <EmptyState
        icon={<Swords />}
        title="Create a season first"
        description="Fixtures belong to a season. Set up a season and add participants before scheduling matches."
      />
    );
  }

  const canSchedule =
    isManager &&
    !isLeagueArchived &&
    (activeSeason.season.status === "draft" || activeSeason.season.status === "active");

  const hasActiveFixtures = seasonMatches.some((m) => m.match.status !== "cancelled");

  return (
    <div className="space-y-6">
      {/* Season & filter controls */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label htmlFor="fixtures-season-select" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Season
          </label>
          <select
            id="fixtures-season-select"
            value={activeSeason.season.id}
            onChange={(e) => {
              setSelectedSeasonId(e.target.value);
              setOpenTool("none");
            }}
            className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-9"
          >
            {seasons.map((s) => (
              <option key={s.season.id} value={s.season.id}>
                #{s.season.number} {s.season.name} ({s.season.status})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: "all", label: "All" },
              { id: "open", label: "Upcoming / Open" },
              { id: "confirmed", label: "Confirmed" },
              { id: "cancelled", label: "Cancelled" },
            ] as const
          ).map((tab) => (
            <Button
              key={tab.id}
              type="button"
              size="sm"
              variant={statusFilter === tab.id ? "secondary" : "ghost"}
              className="min-h-10 sm:min-h-8"
              onClick={() => setStatusFilter(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Manager scheduling tools */}
      {canSchedule && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={openTool === "generate" ? "secondary" : "default"}
              className="min-h-11 sm:min-h-9"
              disabled={hasActiveFixtures || activeSeason.participants.length < 2}
              onClick={() => setOpenTool((t) => (t === "generate" ? "none" : "generate"))}
            >
              <Shuffle /> Generate round-robin
            </Button>

            <Button
              type="button"
              variant={openTool === "single" ? "secondary" : "outline"}
              className="min-h-11 sm:min-h-9"
              disabled={activeSeason.participants.length < 2}
              onClick={() => setOpenTool((t) => (t === "single" ? "none" : "single"))}
            >
              <CalendarPlus /> Add single match
            </Button>
          </div>

          {activeSeason.participants.length < 2 && (
            <p className="text-xs text-muted-foreground">
              Add at least 2 participants to this season (on the Seasons tab) before scheduling matches.
            </p>
          )}

          {openTool === "generate" && !hasActiveFixtures && activeSeason.participants.length >= 2 && (
            <GenerateFixturesForm
              key={activeSeason.season.id}
              leagueId={leagueId}
              season={activeSeason}
              onDone={() => setOpenTool("none")}
            />
          )}

          {openTool === "single" && activeSeason.participants.length >= 2 && (
            <CreateMatchForm
              key={activeSeason.season.id}
              leagueId={leagueId}
              season={activeSeason}
              onDone={() => setOpenTool("none")}
            />
          )}
        </div>
      )}

      {/* Fixtures list */}
      {filteredMatches.length === 0 ? (
        <EmptyState
          icon={<Swords />}
          title={seasonMatches.length === 0 ? "No fixtures scheduled yet" : "No matches match this filter"}
          description={
            seasonMatches.length === 0
              ? canSchedule
                ? "Generate a round-robin schedule automatically or add individual matches."
                : "Your league manager hasn’t generated fixtures for this season yet."
              : "Try switching the filter above to see other matches."
          }
        />
      ) : (
        <div className="space-y-6">
          {groupedByRound.map(([roundLabel, roundMatches]) => (
            <section key={roundLabel} className="space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {roundLabel} (<span className="tabular">{roundMatches.length}</span>)
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                {roundMatches.map((item) => (
                  <MatchCard key={item.match.id} item={item} currentUserId={currentUserId} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function GenerateFixturesForm({
  leagueId,
  season,
  onDone,
}: {
  leagueId: string;
  season: LeagueSeasonWithRoster;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(generateFixturesSchema),
    defaultValues: {
      seasonId: season.season.id,
      doubleRoundRobin: false,
      startAt: "",
      intervalDays: "7",
    },
  });
  const { errors } = form.formState;
  const doubleRR = useWatch({ control: form.control, name: "doubleRoundRobin" });

  const n = season.participants.length;
  const rounds = (n % 2 === 0 ? n - 1 : n) * (doubleRR ? 2 : 1);
  const totalMatches = ((n * (n - 1)) / 2) * (doubleRR ? 2 : 1);

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await generateFixturesAction(leagueId, values);
      if (result.ok) {
        toast.success(result.message ?? "Fixtures generated.");
        onDone();
        router.refresh();
      } else {
        setFormError(result.error);
        applyServerErrors(result, form.setError);
      }
    });
  });

  return (
    <section className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="mb-4">
        <h3 className="font-semibold">Generate round-robin fixtures</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Creates <span className="tabular font-medium text-foreground">{totalMatches}</span> matches
          across <span className="tabular font-medium text-foreground">{rounds}</span> rounds for{" "}
          <span className="tabular font-medium text-foreground">{n}</span> players.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <FormAlert>{formError}</FormAlert>

        <div className="flex items-center justify-between gap-3 rounded-lg border bg-surface-2 p-3">
          <div>
            <p className="text-sm font-medium">Double round-robin (home & away)</p>
            <p className="text-xs text-muted-foreground">
              Every pair plays twice instead of once.
            </p>
          </div>
          <input
            type="checkbox"
            aria-label="Double round-robin"
            className="size-5 accent-primary"
            {...form.register("doubleRoundRobin")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="First round date & time (optional)"
            type="datetime-local"
            description="Leave blank for unscheduled dates."
            error={errors.startAt?.message}
            {...form.register("startAt")}
          />
          <TextField
            label="Days between rounds"
            type="number"
            min={0}
            max={365}
            description="Used when a first round date is set."
            error={errors.intervalDays?.message}
            {...form.register("intervalDays")}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <SubmitButton pending={pending} pendingLabel="Generating…" className="sm:w-auto">
            Generate {totalMatches} fixtures
          </SubmitButton>
          <Button type="button" variant="ghost" className="min-h-11 sm:min-h-9" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
    </section>
  );
}

function CreateMatchForm({
  leagueId,
  season,
  onDone,
}: {
  leagueId: string;
  season: LeagueSeasonWithRoster;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(createMatchSchema),
    defaultValues: {
      seasonId: season.season.id,
      playerAId: season.participants[0]?.id ?? "",
      playerBId: season.participants[1]?.id ?? "",
      round: "",
      scheduledAt: "",
    },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await createMatchAction(leagueId, values);
      if (result.ok) {
        toast.success(result.message ?? "Match scheduled.");
        onDone();
        router.refresh();
      } else {
        setFormError(result.error);
        applyServerErrors(result, form.setError);
      }
    });
  });

  return (
    <section className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="mb-4">
        <h3 className="font-semibold">Add single match</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Schedule a one-off or makeup fixture between two season participants.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <FormAlert>{formError}</FormAlert>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.playerAId?.message)}>
            <FieldLabel htmlFor="match-player-a">Home player</FieldLabel>
            <select
              id="match-player-a"
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              {...form.register("playerAId")}
            >
              {season.participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name} (@{p.username})
                </option>
              ))}
            </select>
            {errors.playerAId?.message && <FieldError>{errors.playerAId.message}</FieldError>}
          </Field>

          <Field data-invalid={Boolean(errors.playerBId?.message)}>
            <FieldLabel htmlFor="match-player-b">Away player</FieldLabel>
            <select
              id="match-player-b"
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              {...form.register("playerBId")}
            >
              {season.participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name} (@{p.username})
                </option>
              ))}
            </select>
            {errors.playerBId?.message ? (
              <FieldError>{errors.playerBId.message}</FieldError>
            ) : (
              <FieldDescription>Must differ from home player.</FieldDescription>
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Round (optional)"
            type="number"
            min={1}
            max={999}
            placeholder="e.g. 1"
            error={errors.round?.message}
            {...form.register("round")}
          />
          <TextField
            label="Kickoff date & time (optional)"
            type="datetime-local"
            error={errors.scheduledAt?.message}
            {...form.register("scheduledAt")}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <SubmitButton pending={pending} pendingLabel="Scheduling…" className="sm:w-auto">
            Add match
          </SubmitButton>
          <Button type="button" variant="ghost" className="min-h-11 sm:min-h-9" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
    </section>
  );
}
