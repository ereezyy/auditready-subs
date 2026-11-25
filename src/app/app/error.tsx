"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="sheet p-6">
      <h1 className="display text-3xl">The workspace hit an error</h1>
      <p className="mt-2 text-sm text-ink-soft">{error.message || "Try the page again."}</p>
      <button type="button" onClick={reset} className="mt-4 text-sm font-semibold text-copper">
        Try again
      </button>
    </div>
  );
}
