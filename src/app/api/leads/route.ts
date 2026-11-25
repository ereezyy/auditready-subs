import { getStore } from "@/lib/store";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string; summary?: unknown } | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Enter a valid email." }, { status: 400 });
  }
  await getStore().addLead({
    email,
    source: "certificate_checker",
    summary: body?.summary ?? null,
  });
  console.log(`[auditready lead] certificate checker ${email}`);
  return Response.json({ ok: true });
}
