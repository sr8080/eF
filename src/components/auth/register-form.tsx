"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { register as registerAction } from "@/lib/actions/auth";
import { registerSchema } from "@/lib/validations/auth";
import { applyServerErrors } from "@/lib/forms";
import { FormAlert, PasswordField, SubmitButton, TextField } from "@/components/forms/form-fields";

export function RegisterForm() {
  const next = useSearchParams().get("next") ?? undefined;
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: "", username: "", email: "", password: "", confirmPassword: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await registerAction(values, next);
      if (!result) return; // redirected (email confirmation disabled)
      if (result.ok) {
        setSentTo(values.email);
      } else {
        setFormError(result.error);
        applyServerErrors(result, form.setError);
      }
    });
  });

  if (sentTo) {
    return (
      <div className="flex flex-col items-center py-4 text-center">
        <div className="mb-4 grid size-12 place-items-center rounded-full bg-primary/15 text-primary">
          <MailCheck className="size-6" />
        </div>
        <h2 className="text-lg font-semibold">Confirm your email</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a confirmation link to <span className="font-medium text-foreground">{sentTo}</span>.
          Open it on this device to activate your account.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormAlert>{formError}</FormAlert>

      <TextField
        label="Display name"
        autoComplete="nickname"
        placeholder="e.g. Alex Silva"
        description="Shown in tables and fixtures."
        error={errors.displayName?.message}
        {...form.register("displayName")}
      />

      <TextField
        label="Username"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="e.g. alex_10"
        description="Friends use this to invite you. Lowercase letters, numbers, underscore."
        error={errors.username?.message}
        {...form.register("username")}
      />

      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="you@example.com"
        error={errors.email?.message}
        {...form.register("email")}
      />

      <PasswordField
        label="Password"
        autoComplete="new-password"
        description="At least 8 characters."
        error={errors.password?.message}
        {...form.register("password")}
      />

      <PasswordField
        label="Confirm password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...form.register("confirmPassword")}
      />

      <SubmitButton pending={pending} pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
