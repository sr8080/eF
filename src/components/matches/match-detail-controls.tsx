"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ban, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { cancelMatchAction, rescheduleMatchAction } from "@/lib/actions/match";
import { toDatetimeLocalValue } from "@/lib/match-status";
import { rescheduleMatchSchema } from "@/lib/validations/match";
import { applyServerErrors } from "@/lib/forms";
import { FormAlert, SubmitButton, TextField } from "@/components/forms/form-fields";
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

export function MatchDetailControls({
  leagueId,
  matchId,
  initialRound,
  initialScheduledAt,
}: {
  leagueId: string;
  matchId: string;
  initialRound: number | null;
  initialScheduledAt: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(rescheduleMatchSchema),
    defaultValues: {
      round: initialRound !== null ? String(initialRound) : "",
      scheduledAt: toDatetimeLocalValue(initialScheduledAt),
    },
  });
  const { errors, isDirty } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await rescheduleMatchAction(leagueId, matchId, values);
      if (result.ok) {
        toast.success(result.message ?? "Match schedule updated.");
        form.reset(values);
        router.refresh();
      } else {
        setFormError(result.error);
        applyServerErrors(result, form.setError);
      }
    });
  });

  function onCancelMatch() {
    startTransition(async () => {
      const result = await cancelMatchAction(leagueId, matchId);
      if (result.ok) {
        toast.success(result.message ?? "Match cancelled.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <section className="rounded-xl border bg-card p-4 sm:p-5" aria-labelledby="manage-match-heading">
      <div className="mb-4 flex items-center gap-2">
        <CalendarClock className="size-4 text-primary" />
        <h2 id="manage-match-heading" className="font-semibold">
          Manage fixture
        </h2>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <FormAlert>{formError}</FormAlert>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Round"
            type="number"
            min={1}
            max={999}
            placeholder="Unassigned"
            error={errors.round?.message}
            {...form.register("round")}
          />
          <TextField
            label="Kickoff date & time"
            type="datetime-local"
            error={errors.scheduledAt?.message}
            {...form.register("scheduledAt")}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <SubmitButton
            pending={pending}
            pendingLabel="Saving…"
            disabled={pending || !isDirty}
            className="sm:w-auto"
          >
            Save schedule
          </SubmitButton>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" className="min-h-11 sm:min-h-9" disabled={pending}>
                <Ban /> Cancel match
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel this match?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cancelled matches cannot be played or restored. You can add a new match later if needed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep match</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={onCancelMatch}>
                  Cancel match
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </form>
    </section>
  );
}
