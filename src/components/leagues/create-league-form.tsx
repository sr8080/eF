"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImageUp, X } from "lucide-react";
import { toast } from "sonner";
import { createLeagueAction } from "@/lib/actions/league";
import {
  LEAGUE_LOGO_ACCEPT,
  LEAGUE_LOGO_MAX_BYTES,
  LEAGUE_LOGO_TYPES,
  leagueDetailsSchema,
} from "@/lib/validations/league";
import { applyServerErrors } from "@/lib/forms";
import { FormAlert, SubmitButton, TextField } from "@/components/forms/form-fields";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { LeagueLogo } from "./league-badges";

export function CreateLeagueForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(leagueDetailsSchema),
    defaultValues: { name: "", description: "" },
  });
  const { errors } = form.formState;
  const leagueName = useWatch({ control: form.control, name: "name" }) ?? "";
  const description = useWatch({ control: form.control, name: "description" }) ?? "";

  function onLogoChosen(file: File | undefined) {
    if (!file) return;
    if (!LEAGUE_LOGO_TYPES[file.type]) {
      toast.error("Use a PNG, JPG or WebP image.");
      return;
    }
    if (file.size > LEAGUE_LOGO_MAX_BYTES) {
      toast.error("Logo must be 2 MB or smaller.");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setLogoFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function clearLogo() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setLogoFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    const data = new FormData();
    data.set("name", values.name);
    data.set("description", values.description);
    if (logoFile) data.set("logo", logoFile);

    startTransition(async () => {
      const result = await createLeagueAction(data);
      if (result.ok && result.data) {
        if (result.data.warning) toast.warning(result.data.warning);
        else toast.success(result.message ?? "League created.");
        router.push(`/leagues/${result.data.leagueId}`);
      } else if (!result.ok) {
        setFormError(result.error);
        applyServerErrors(result, form.setError);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormAlert>{formError}</FormAlert>

      <div className="flex items-center gap-4">
        <LeagueLogo name={leagueName || "League"} src={previewUrl} size="lg" />
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={LEAGUE_LOGO_ACCEPT}
            className="sr-only"
            id="new-league-logo"
            onChange={(e) => onLogoChosen(e.target.files?.[0])}
            disabled={pending}
          />
          <Button
            type="button"
            variant="secondary"
            className="min-h-11"
            disabled={pending}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageUp /> {logoFile ? "Change logo" : "Add logo (optional)"}
          </Button>
          {logoFile && (
            <Button type="button" variant="ghost" className="min-h-11" onClick={clearLogo} disabled={pending}>
              <X /> Remove
            </Button>
          )}
          <p className="w-full text-xs text-muted-foreground">PNG, JPG or WebP, up to 2 MB.</p>
        </div>
      </div>

      <TextField
        label="League name"
        placeholder="e.g. Sunday Super League"
        description="3–50 characters."
        error={errors.name?.message}
        {...form.register("name")}
      />

      <Field data-invalid={Boolean(errors.description?.message)}>
        <div className="flex items-center justify-between gap-2">
          <FieldLabel htmlFor="league-description">Description (optional)</FieldLabel>
          <span className="tabular text-xs text-muted-foreground">{description.length}/280</span>
        </div>
        <textarea
          id="league-description"
          rows={3}
          maxLength={280}
          placeholder="House rules, match days, bragging-rights stakes…"
          aria-invalid={Boolean(errors.description?.message)}
          className="w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-2.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30"
          {...form.register("description")}
        />
        {errors.description?.message ? (
          <FieldError>{errors.description.message}</FieldError>
        ) : (
          <FieldDescription>Up to 280 characters.</FieldDescription>
        )}
      </Field>

      <SubmitButton pending={pending} pendingLabel="Creating league…">
        Create league
      </SubmitButton>
    </form>
  );
}
