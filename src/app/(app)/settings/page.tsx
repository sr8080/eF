import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import { changePassword } from "@/lib/actions/profile";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { ProfileForm } from "@/components/settings/profile-form";
import { AvatarUploader } from "@/components/settings/avatar-uploader";
import { NewPasswordForm } from "@/components/auth/new-password-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <PageContainer className="max-w-2xl">
      <PageHeader eyebrow="Account" title="Settings" description="Manage your profile and sign-in details." />
      <Suspense fallback={<SettingsSkeleton />}>
        <Settings />
      </Suspense>
    </PageContainer>
  );
}

async function Settings() {
  const { profile, email } = await requireUser("/settings");

  return (
    <div className="space-y-4">
      <Section title="Profile photo">
        <AvatarUploader name={profile.display_name} avatarUrl={profile.avatar_url} />
      </Section>

      <Section title="Profile" description="How other players see you.">
        <ProfileForm defaults={{ displayName: profile.display_name, username: profile.username }} />
      </Section>

      <Section title="Password" description={<>Signed in as <span className="text-foreground">{email}</span></>}>
        <NewPasswordForm action={changePassword} />
      </Section>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="mb-4">
        <h2 className="font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-56 rounded-xl" />
    </div>
  );
}
