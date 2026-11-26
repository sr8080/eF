import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { resetPassword } from "@/lib/actions/auth";
import { AuthCard, AuthCardSkeleton } from "@/components/auth/auth-card";
import { NewPasswordForm } from "@/components/auth/new-password-form";
import { FormAlert } from "@/components/forms/form-fields";

export const metadata: Metadata = { title: "Set a new password" };

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Set a new password" description="Choose a password you haven’t used here before.">
      <Suspense fallback={<AuthCardSkeleton />}>
        <ResetPasswordGate />
      </Suspense>
    </AuthCard>
  );
}

/** The recovery link signs the user in; without that session the link was invalid. */
async function ResetPasswordGate() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="space-y-4">
        <FormAlert>This reset link is invalid or has expired.</FormAlert>
        <Link
          href="/forgot-password"
          className="block text-center text-sm font-medium text-primary hover:underline"
        >
          Request a new link
        </Link>
      </div>
    );
  }
  return <NewPasswordForm action={resetPassword} submitLabel="Save new password" />;
}
