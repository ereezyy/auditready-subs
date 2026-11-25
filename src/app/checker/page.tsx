import Link from "next/link";
import { Checker } from "@/components/checker";
import { Wordmark } from "@/components/wordmark";

export const instant = false;

export const metadata = { title: "Certificate checker" };

export default function CheckerPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16">
      <header className="flex items-center justify-between py-5">
        <Wordmark />
        <Link href="/signup" className="text-sm font-semibold">
          Track every sub
        </Link>
      </header>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-copper">Free, no account</p>
      <h1 className="display mt-3 text-5xl">Check one certificate</h1>
      <p className="mt-3 max-w-2xl text-ink-soft leading-7">
        Graded against a typical small-GC set: $1,000,000 / $2,000,000 general liability, workers&apos; comp
        required, additional insured expected. Your own requirements, once you have an account, can differ.
      </p>
      <div className="mt-6">
        <Checker />
      </div>
      <p className="mt-4 text-sm">
        Sample file: <a className="font-semibold text-copper" href="/api/samples/acord-herrera.pdf">acord-herrera.pdf</a>
        {" · "}
        <a className="font-semibold text-copper" href="/api/samples/acord-herrera.png">acord-herrera.png</a>
      </p>
    </div>
  );
}
