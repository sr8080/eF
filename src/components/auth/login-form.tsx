"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { login } from "@/lib/actions/auth";
import { loginSchema } from "@/lib/validations/auth";
import { applyServerErrors } from "@/lib/forms";
import { FormAlert, PasswordField, SubmitButton, TextField } from "@/components/forms/form-fields";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? undefined;
  const linkError = searchParams.get("error");

  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(linkError);

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await login(values, next);
      // On success the action redirects, so we only get here on failure.
      if (result && !result.ok) {
        setFormError(result.error);
        applyServerErrors(result, form.setError);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormAlert>{formError}</FormAlert>

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
        autoComplete="current-password"
        error={errors.password?.message}
        trailing={
          <Link href="/forgot-password" className="text-xs font-medium text-info hover:underline">
            Forgot password?
          </Link>
        }
        {...form.register("password")}
      />

      <SubmitButton pending={pending} pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
