import Link from "next/link";
import { LoginForm } from "@/components/auth-forms";
import { Wordmark } from "@/components/wordmark";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/seed";
import { isSupabaseConfigured } from "@/lib/env";

export const instant = false;

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  const hint = isSupabaseConfigured()
    ? null
    : `Demo workspace: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`;
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <Wordmark />
      <h1 className="display mt-8 text-4xl">Sign in</h1>
      <p className="mt-2 text-sm text-ink-soft">Contractor accounts only. Subs use an upload link, not a password.</p>
      <div className="sheet mt-6 p-5">
        <LoginForm demoHint={hint} />
      </div>
      <p className="mt-4 text-sm">
        New here? <Link href="/signup" className="font-semibold text-copper">Start the 14-day trial</Link>
      </p>
    </div>
  );
}
