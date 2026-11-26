import { Skeleton } from "@/components/ui/skeleton";

export default function LeagueLoading() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-44 rounded-xl" />
      <Skeleton className="h-56 rounded-xl" />
    </div>
  );
}
