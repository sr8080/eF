import type { ReactNode } from "react";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="rounded-xl border bg-card/80 p-5 shadow-2xl shadow-black/30 backdrop-blur-sm sm:p-6">
        {children}
      </div>
      {footer && <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div>}
    </div>
  );
}

export function AuthCardSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading form">
      {[0, 1].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          <div className="h-11 animate-pulse rounded-lg bg-muted" />
        </div>
      ))}
      <div className="h-11 animate-pulse rounded-lg bg-primary/20" />
    </div>
  );
}
