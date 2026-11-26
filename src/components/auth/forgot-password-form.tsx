"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { requestPasswordReset } from "@/lib/actions/auth";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { applyServerErrors } from "@/lib/forms";
import { FormAlert, SubmitButton, TextField } from "@/components/forms/form-fields";

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    setStatus(null);
    startTransition(async () => {
      const result = await requestPasswordReset(values);
      if (result.ok) {
        setStatus({ ok: true, text: result.message ?? "Check your inbox." });
        form.reset();
      } else {
        setStatus({ ok: false, text: result.error });
        applyServerErrors(result, form.setError);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {status && <FormAlert variant={status.ok ? "success" : "error"}>{status.text}</FormAlert>}
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="you@example.com"
        error={form.formState.errors.email?.message}
        {...form.register("email")}
      />
      <SubmitButton pending={pending} pendingLabel="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}
