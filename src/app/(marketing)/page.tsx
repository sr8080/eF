import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  CalendarDays,
  Camera,
  ChartColumn,
  History,
  Link2,
  ListOrdered,
  ShieldCheck,
  Upload,
  UserCheck,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { GuestButtons, HeaderAuth } from "@/components/marketing/header-auth";
import { HeroPreview } from "@/components/marketing/hero-preview";

const features = [
  {
    icon: Link2,
    title: "Private leagues",
    body: "Create a league, share an invite link, and your crew is in. Run as many leagues and seasons as you like.",
  },
  {
    icon: CalendarDays,
    title: "Fixtures in one tap",
    body: "Generate single or double round-robin schedules automatically, or arrange one-off matches yourselves.",
  },
  {
    icon: ShieldCheck,
    title: "Verified results",
    body: "Every score is confirmed by the opponent before it counts. Disputes go to a league admin. Nothing slips through.",
  },
  {
    icon: ListOrdered,
    title: "Live standings",
    body: "Points, goal difference, goals scored and head-to-head tie-breaks, recalculated the moment a result is confirmed.",
  },
  {
    icon: ChartColumn,
    title: "Stats that settle arguments",
    body: "Win rates, streaks, biggest wins and head-to-head records for every player in the league.",
  },
  {
    icon: History,
    title: "Every season on record",
    body: "Start a new season without losing the old one. Champions and historical tables are kept for good.",
  },
];

const steps = [
  { icon: Upload, title: "Submit", body: "Enter the final score after the match. Attach the result screen as proof." },
  { icon: UserCheck, title: "Confirm", body: "Your opponent approves it, or disputes it for an admin to review." },
  { icon: ListOrdered, title: "Table updates", body: "Only confirmed results count, so the standings are always trustworthy." },
];

export default function LandingPage() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip">
      <header className="sticky top-0 z-40 border-b border-transparent bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-1 sm:gap-2">
            <Suspense fallback={<GuestButtons />}>
              <HeaderAuth />
            </Suspense>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative">
          <div aria-hidden className="pitch-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
          <div aria-hidden className="glow-primary absolute inset-x-0 top-0 h-[520px]" />

          <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-4 pb-24 pt-12 sm:px-6 md:pt-20 lg:grid-cols-2 lg:gap-10">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                <span className="size-1.5 rounded-full bg-primary" /> Free for friend groups
              </p>
              <h1 className="text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-6xl">
                Your eFootball league,{" "}
                <span className="bg-gradient-to-r from-primary to-teal-300 bg-clip-text text-transparent">
                  properly run.
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
                Fixtures, verified results, live standings and bragging-rights stats for you and your mates. No more
                spreadsheets or “I swear it was 3–2” in the group chat.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/register">
                    Start your league <ArrowRight />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/login">I have an account</Link>
                </Button>
              </div>
            </div>

            <HeroPreview />
          </div>
        </section>

        {/* Features */}
        <section className="border-t bg-card/30">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Everything a league needs</p>
              <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Built like a real competition</h2>
            </div>
            <div className="mt-10 grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, body }) => (
                <div key={title} className="bg-background p-5 transition-colors hover:bg-card sm:p-6">
                  <div className="mb-4 grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How verification works */}
        <section className="border-t">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
            <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Fair play</p>
                <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">No result counts until both players agree</h2>
                <p className="mt-4 text-muted-foreground">
                  Every submission, approval and correction is logged. Admins resolve disputes with the screenshot right
                  in front of them.
                </p>
                <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Camera className="size-4 text-info" /> Screenshot evidence is visible only to league members.
                </p>
              </div>
              <ol className="grid gap-3 sm:grid-cols-3">
                {steps.map(({ icon: Icon, title, body }, i) => (
                  <li key={title} className="relative rounded-xl border bg-card p-5">
                    <span className="tabular absolute right-4 top-4 text-xs text-muted-foreground">0{i + 1}</span>
                    <Icon className="mb-6 size-6 text-primary" />
                    <h3 className="font-semibold">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="relative overflow-hidden rounded-2xl border bg-card px-6 py-10 text-center sm:px-10 sm:py-14">
              <div aria-hidden className="glow-primary absolute inset-0" />
              <div className="relative">
                <h2 className="text-2xl font-semibold sm:text-3xl">Kick off your first season tonight</h2>
                <p className="mx-auto mt-3 max-w-md text-muted-foreground">
                  Set up takes two minutes. Your friends join with a link.
                </p>
                <Button asChild size="lg" className="mt-7">
                  <Link href="/register">
                    Create a free account <ArrowRight />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <Logo className="opacity-80" />
          <p>Fan-made league tracker. Not affiliated with KONAMI or eFootball™.</p>
        </div>
      </footer>
    </div>
  );
}
