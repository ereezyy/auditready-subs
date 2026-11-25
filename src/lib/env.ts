export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.FORCE_MOCKS !== "1" &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function isVisionConfigured(): boolean {
  return Boolean(
    process.env.FORCE_MOCKS !== "1" &&
      process.env.EXTRACTION_API_URL &&
      process.env.EXTRACTION_API_KEY,
  );
}

export function emailMode(): "console" | "resend" {
  if (process.env.FORCE_MOCKS === "1" || !process.env.RESEND_API_KEY) return "console";
  return "resend";
}

export function stripeMode(): "mock" | "test" {
  if (process.env.FORCE_MOCKS === "1" || !process.env.STRIPE_SECRET_KEY) return "mock";
  assertStripeTestKey(process.env.STRIPE_SECRET_KEY);
  return "test";
}

export function assertStripeTestKey(key: string) {
  if (key.startsWith("sk_live") || key.startsWith("rk_live") || key.startsWith("pk_live")) {
    throw new Error("Refusing a live Stripe key. AuditReady Subs only accepts test-mode keys.");
  }
  if (!key.startsWith("sk_test") && !key.startsWith("rk_test")) {
    throw new Error("STRIPE_SECRET_KEY must be a Stripe test secret (sk_test_...).");
  }
}

export type RuntimeMode = {
  data: "local" | "supabase";
  email: "console" | "resend";
  stripe: "mock" | "test";
  extraction: "local" | "vision";
  demoToday: string | null;
};

export function runtimeMode(): RuntimeMode {
  return {
    data: isSupabaseConfigured() ? "supabase" : "local",
    email: emailMode(),
    stripe: stripeMode(),
    extraction: isVisionConfigured() ? "vision" : "local",
    demoToday: process.env.DEMO_TODAY?.trim() || null,
  };
}
