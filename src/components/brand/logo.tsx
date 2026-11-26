import Link from "next/link";
import { cn } from "@/lib/utils";

/** Mark: a pitch centre-circle inside a rounded badge. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8", className)}>
      <defs>
        <linearGradient id="elh-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22F07A" />
          <stop offset="1" stopColor="#14B8A6" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#elh-g)" />
      <g fill="none" stroke="#03140A" strokeWidth="2.2" strokeLinecap="round">
        <line x1="16" y1="6" x2="16" y2="26" />
        <circle cx="16" cy="16" r="5.5" />
      </g>
      <circle cx="16" cy="16" r="1.6" fill="#03140A" />
    </svg>
  );
}

export function Logo({
  href = "/",
  className,
  compact = false,
}: {
  href?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn("flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50", className)}
    >
      <LogoMark className="size-8 shrink-0" />
      {!compact && (
        <span className="leading-none">
          <span className="block text-[0.95rem] font-semibold tracking-tight">eFootball</span>
          <span className="block text-[0.7rem] font-medium uppercase tracking-[0.18em] text-primary">
            League Hub
          </span>
        </span>
      )}
    </Link>
  );
}
