"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth";
import { applyServerErrors } from "@/lib/forms";
import type { ActionResult } from "@/lib/actions/result";
import { FormAlert, PasswordField, SubmitButton } from "@/components/forms/form-fields";

/**
 * Set-a-new-password form. Used by /reset-password (recovery flow) and by
 * Settings (signed-in change), each passing its own Server Action.
 */
export function NewPasswordForm({
  action,
  submitLabel = "Update password",
}: {
  action: (input: ResetPasswordInput) => Promise<ActionResult>;
  submitLabel?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await action(values);
      if (!result) return; // redirected
      if (result.ok) {
        toast.success(result.message ?? "Password updated.");
        form.reset();
      } else {
        setFormError(result.error);
        applyServerErrors(result, form.setError);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormAlert>{formError}</FormAlert>
      <PasswordField
        label="New password"
        autoComplete="new-password"
        description="At least 8 characters."
        error={errors.password?.message}
        {...form.register("password")}
      />
      <PasswordField
        label="Confirm new password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...form.register("confirmPassword")}
      />
      <SubmitButton pending={pending} pendingLabel="Saving…">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
