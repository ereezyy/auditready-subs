import Link from "next/link";
import { SignupForm } from "@/components/auth-forms";
import { Wordmark } from "@/components/wordmark";

export const instant = false;

export const metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <Wordmark />
      <h1 className="display mt-8 text-4xl">Open a workspace</h1>
      <p className="mt-2 text-sm leading-6 text-ink-soft">
        14 days of Pro, then the free plan holds 3 subcontractors. No card.
      </p>
      <div className="sheet mt-6 p-5">
        <SignupForm />
      </div>
      <p className="mt-4 text-sm">
        Already have an account? <Link href="/login" className="font-semibold text-copper">Sign in</Link>
      </p>
    </div>
  );
}
