"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { Eye, EyeOff, CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type TextFieldProps = ComponentProps<typeof Input> & {
  label: string;
  error?: string;
  description?: ReactNode;
  trailing?: ReactNode;
  /** Rendered inside the input box, on the right (e.g. a show/hide toggle). */
  adornment?: ReactNode;
};

/** Label + input + error, wired for accessibility. Spread `form.register(...)` into it. */
export function TextField({
  label,
  error,
  description,
  trailing,
  adornment,
  id,
  className,
  ...props
}: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const descId = `${inputId}-desc`;

  return (
    <Field data-invalid={Boolean(error)} className={className}>
      <div className="flex items-center justify-between gap-2">
        <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
        {trailing}
      </div>
      <div className="relative">
        <Input
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={cn(error && errorId, description && descId) || undefined}
          className={cn(adornment && "pr-12")}
          {...props}
        />
        {adornment && <div className="absolute inset-y-0 right-1 flex items-center">{adornment}</div>}
      </div>
      {description && !error && <FieldDescription id={descId}>{description}</FieldDescription>}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  );
}

/** Password input with a show/hide toggle (important on phones). */
export function PasswordField(props: Omit<TextFieldProps, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      adornment={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="text-muted-foreground hover:text-foreground"
        >
          {visible ? <EyeOff /> : <Eye />}
        </Button>
      }
    />
  );
}

export function FormAlert({
  variant = "error",
  children,
}: {
  variant?: "error" | "success";
  children: ReactNode;
}) {
  if (!children) return null;
  const Icon = variant === "error" ? CircleAlert : CircleCheck;
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm",
        variant === "error"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-primary/30 bg-primary/10 text-primary",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

export function SubmitButton({
  pending,
  children,
  pendingLabel,
  className,
  ...props
}: ComponentProps<typeof Button> & { pending: boolean; pendingLabel?: string }) {
  return (
    <Button type="submit" size="lg" disabled={pending} className={cn("w-full", className)} {...props}>
      {pending && <LoaderCircle className="animate-spin" />}
      {pending ? (pendingLabel ?? children) : children}
    </Button>
  );
}
