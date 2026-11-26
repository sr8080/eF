import { AuthCard, AuthCardSkeleton } from "@/components/auth/auth-card";

export default function JoinCodeLoading() {
  return (
    <AuthCard title="Loading invite…">
      <AuthCardSkeleton />
    </AuthCard>
  );
}
