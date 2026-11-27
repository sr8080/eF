import { PageContainer } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlayerLoading() {
  return (
    <PageContainer>
      <Skeleton className="mb-6 h-24 rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-56 rounded-xl lg:col-span-2" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    </PageContainer>
  );
}
