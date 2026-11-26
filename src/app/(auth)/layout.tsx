import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div aria-hidden className="pitch-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div aria-hidden className="glow-primary pointer-events-none absolute inset-x-0 top-0 h-96" />

      <header className="relative z-10 px-4 pt-5 sm:px-6">
        <Logo />
      </header>

      <main className="relative z-10 flex flex-1 items-start justify-center px-4 pb-10 pt-8 sm:items-center sm:pt-0">
        <div className="w-full max-w-[400px]">{children}</div>
      </main>
    </div>
  );
}
