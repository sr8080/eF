import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";

export function GuestButtons() {
  return (
    <>
      <Button asChild variant="ghost">
        <Link href="/login">Sign in</Link>
      </Button>
      <Button asChild>
        <Link href="/register">Get started</Link>
      </Button>
    </>
  );
}

/** Reads the session, so render inside <Suspense fallback={<GuestButtons />}>. */
export async function HeaderAuth() {
  const user = await getCurrentUser();
  if (!user) return <GuestButtons />;
  return (
    <Button asChild>
      <Link href="/dashboard">
        Open dashboard <ArrowRight />
      </Link>
    </Button>
  );
}
