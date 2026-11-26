import { PageContainer } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function LeaguesLoading() {
  return (
    <PageContainer>
      <Skeleton className="mb-2 h-3 w-20" />
      <Skeleton className="mb-6 h-8 w-48" />
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    </PageContainer>
  );
}
