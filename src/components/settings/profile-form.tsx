"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { updateProfile } from "@/lib/actions/profile";
import { profileSchema } from "@/lib/validations/auth";
import { applyServerErrors } from "@/lib/forms";
import { FormAlert, SubmitButton, TextField } from "@/components/forms/form-fields";

export function ProfileForm({ defaults }: { defaults: { displayName: string; username: string } }) {
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: defaults,
  });
  const { errors, isDirty } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await updateProfile(values);
      if (result.ok) {
        toast.success(result.message ?? "Saved.");
        form.reset(values);
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
        label="Display name"
        autoComplete="nickname"
        error={errors.displayName?.message}
        {...form.register("displayName")}
      />
      <TextField
        label="Username"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        description="Lowercase letters, numbers and underscore. 3–20 characters."
        error={errors.username?.message}
        {...form.register("username")}
      />
      <SubmitButton pending={pending} pendingLabel="Saving…" disabled={pending || !isDirty} className="sm:w-auto">
        Save changes
      </SubmitButton>
    </form>
  );
}
