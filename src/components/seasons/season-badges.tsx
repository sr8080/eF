import { Archive, CheckCircle2, FileEdit, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SeasonStatus } from "@/types/database";

const STATUS_META: Record<
  SeasonStatus,
  { label: string; icon: typeof Flame; className: string }
> = {
  draft: {
    label: "Draft",
    icon: FileEdit,
    className: "border-border bg-secondary text-secondary-foreground",
  },
  active: {
    label: "Active",
    icon: Flame,
    className: "border-primary/30 bg-primary/15 text-primary",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className: "border-info/30 bg-info/15 text-info",
  },
  archived: {
    label: "Archived",
    icon: Archive,
    className: "border-warning/30 bg-warning/10 text-warning",
  },
};

export function SeasonStatusBadge({ status }: { status: SeasonStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", meta.className)}>
      <Icon className="size-3" />
      {meta.label}
    </Badge>
  );
}
