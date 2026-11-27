import {
  AlertTriangle,
  Ban,
  CalendarClock,
  CheckCircle2,
  Clock,
  Hourglass,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MatchDisplayStatus } from "@/lib/match-status";
import { cn } from "@/lib/utils";

const STATUS_META: Record<
  MatchDisplayStatus,
  { label: string; icon: typeof Clock; className: string }
> = {
  scheduled: {
    label: "Scheduled",
    icon: CalendarClock,
    className: "border-info/30 bg-info/15 text-info",
  },
  pending_result: {
    label: "Pending result",
    icon: Clock,
    className: "border-warning/30 bg-warning/15 text-warning",
  },
  awaiting_confirmation: {
    label: "Awaiting confirmation",
    icon: Hourglass,
    className: "border-warning/30 bg-warning/15 text-warning",
  },
  confirmed: {
    label: "Confirmed",
    icon: CheckCircle2,
    className: "border-primary/30 bg-primary/15 text-primary",
  },
  disputed: {
    label: "Disputed",
    icon: AlertTriangle,
    className: "border-destructive/30 bg-destructive/15 text-destructive",
  },
  cancelled: {
    label: "Cancelled",
    icon: Ban,
    className: "border-border bg-secondary text-muted-foreground",
  },
};

export function MatchStatusBadge({ status }: { status: MatchDisplayStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", meta.className)}>
      <Icon className="size-3" />
      {meta.label}
    </Badge>
  );
}
