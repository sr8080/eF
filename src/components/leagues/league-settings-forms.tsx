"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Archive, ArchiveRestore, ArrowRightLeft, ImageUp, LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  archiveLeagueAction,
  removeLeagueLogoAction,
  transferOwnershipAction,
  unarchiveLeagueAction,
  updateLeagueAction,
  uploadLeagueLogoAction,
} from "@/lib/actions/league";
import {
  LEAGUE_LOGO_ACCEPT,
  LEAGUE_LOGO_MAX_BYTES,
  LEAGUE_LOGO_TYPES,
  leagueDetailsSchema,
} from "@/lib/validations/league";
import type { LeagueMemberWithProfile } from "@/lib/leagues";
import { applyServerErrors } from "@/lib/forms";
import { FormAlert, SubmitButton, TextField } from "@/components/forms/form-fields";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
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
import { LeagueLogo } from "./league-badges";

export function LeagueLogoUploader({
  leagueId,
  name,
  logoUrl,
  isArchived,
}: {
  leagueId: string;
  name: string;
  logoUrl: string | null;
  isArchived: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function onFileChosen(file: File | undefined) {
    if (!file) return;
    if (!LEAGUE_LOGO_TYPES[file.type]) {
      toast.error("Use a PNG, JPG or WebP image.");
      return;
    }
    if (file.size > LEAGUE_LOGO_MAX_BYTES) {
      toast.error("Logo must be 2 MB or smaller.");
      return;
    }

    const data = new FormData();
    data.set("logo", file);
    startTransition(async () => {
      const result = await uploadLeagueLogoAction(leagueId, data);
      if (result.ok) {
        toast.success(result.message ?? "League logo updated.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function onRemove() {
    startTransition(async () => {
      const result = await removeLeagueLogoAction(leagueId);
      if (result.ok) {
        toast.success(result.message ?? "League logo removed.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <LeagueLogo name={name} src={logoUrl} size="lg" />
        {pending && (
          <div className="absolute inset-0 grid place-items-center rounded-xl bg-background/70">
            <LoaderCircle className="size-5 animate-spin text-primary" />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={LEAGUE_LOGO_ACCEPT}
          className="sr-only"
          id="league-logo-input"
          onChange={(e) => onFileChosen(e.target.files?.[0])}
          disabled={pending || isArchived}
        />
        <Button
          type="button"
          variant="secondary"
          className="min-h-11"
          disabled={pending || isArchived}
          onClick={() => inputRef.current?.click()}
        >
          <ImageUp /> {logoUrl ? "Change logo" : "Upload logo"}
        </Button>

        {logoUrl && !isArchived && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" className="min-h-11 text-muted-foreground" disabled={pending}>
                <Trash2 /> Remove
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove league logo?</AlertDialogTitle>
                <AlertDialogDescription>The league initials emblem will be shown instead.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={onRemove}>
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <p className="w-full text-xs text-muted-foreground">PNG, JPG or WebP, up to 2 MB.</p>
      </div>
    </div>
  );
}

export function LeagueSettingsForm({
  leagueId,
  defaults,
  isArchived,
}: {
  leagueId: string;
  defaults: { name: string; description: string };
  isArchived: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(leagueDetailsSchema),
    defaultValues: defaults,
  });
  const { errors, isDirty } = form.formState;
  const description = useWatch({ control: form.control, name: "description" }) ?? "";

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await updateLeagueAction(leagueId, values);
      if (result.ok) {
        toast.success(result.message ?? "League settings saved.");
        form.reset(values);
        router.refresh();
      } else {
        setFormError(result.error);
        applyServerErrors(result, form.setError);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormAlert>{formError}</FormAlert>

      <TextField
        label="League name"
        disabled={isArchived || pending}
        error={errors.name?.message}
        {...form.register("name")}
      />

      <Field data-invalid={Boolean(errors.description?.message)}>
        <div className="flex items-center justify-between gap-2">
          <FieldLabel htmlFor="settings-league-description">Description</FieldLabel>
          <span className="tabular text-xs text-muted-foreground">{description.length}/280</span>
        </div>
        <textarea
          id="settings-league-description"
          rows={3}
          maxLength={280}
          disabled={isArchived || pending}
          aria-invalid={Boolean(errors.description?.message)}
          className="w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-2.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30"
          {...form.register("description")}
        />
        {errors.description?.message ? (
          <FieldError>{errors.description.message}</FieldError>
        ) : (
          <FieldDescription>Up to 280 characters.</FieldDescription>
        )}
      </Field>

      <SubmitButton
        pending={pending}
        pendingLabel="Saving…"
        disabled={isArchived || pending || !isDirty}
        className="sm:w-auto"
      >
        Save changes
      </SubmitButton>
    </form>
  );
}

export function LeagueDangerZone({
  leagueId,
  leagueName,
  currentUserId,
  isArchived,
  members,
}: {
  leagueId: string;
  leagueName: string;
  currentUserId: string;
  isArchived: boolean;
  members: LeagueMemberWithProfile[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const eligibleMembers = members.filter((m) => m.userId !== currentUserId);
  const [targetUserId, setTargetUserId] = useState<string>(eligibleMembers[0]?.userId ?? "");

  const selectedMember = eligibleMembers.find((m) => m.userId === targetUserId);

  function onTransfer() {
    if (!targetUserId) return;
    startTransition(async () => {
      const result = await transferOwnershipAction(leagueId, targetUserId);
      if (result.ok) {
        toast.success(result.message ?? "Ownership transferred.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function onToggleArchive() {
    startTransition(async () => {
      const result = isArchived
        ? await unarchiveLeagueAction(leagueId)
        : await archiveLeagueAction(leagueId);
      if (result.ok) {
        toast.success(result.message ?? "Updated.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-surface-2 p-4">
        <h3 className="font-medium">Transfer ownership</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Hand over owner control to another member. You will become an admin.
        </p>

        {eligibleMembers.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Invite at least one other member before transferring ownership.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <select
              aria-label="New league owner"
              value={targetUserId}
              disabled={isArchived || pending}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="h-11 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
            >
              {eligibleMembers.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.profile.display_name} (@{m.profile.username}) — {m.role}
                </option>
              ))}
            </select>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 shrink-0"
                  disabled={isArchived || pending || !targetUserId}
                >
                  <ArrowRightLeft /> Transfer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Transfer ownership of {leagueName}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {selectedMember
                      ? `${selectedMember.profile.display_name} (@${selectedMember.profile.username}) will become the league owner, and your role will change to admin.`
                      : "You will become an admin."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onTransfer}>Confirm transfer</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <div className="flex flex-col justify-between gap-3 rounded-lg border border-destructive/25 bg-surface-2 p-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="font-medium">{isArchived ? "Restore league" : "Archive league"}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {isArchived
              ? "Reopen this league so managers can edit settings and players can join again."
              : "Make this league read-only and block new joins. Existing history stays visible."}
          </p>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant={isArchived ? "secondary" : "destructive"}
              className="min-h-11 shrink-0"
              disabled={pending}
            >
              {isArchived ? <ArchiveRestore /> : <Archive />}
              {isArchived ? "Unarchive league" : "Archive league"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {isArchived ? `Restore ${leagueName}?` : `Archive ${leagueName}?`}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {isArchived
                  ? "Managers will be able to update settings and invite new members again."
                  : "Settings, member roles, and invite links will be locked until you unarchive it."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant={isArchived ? "default" : "destructive"}
                onClick={onToggleArchive}
              >
                {isArchived ? "Unarchive" : "Archive"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
