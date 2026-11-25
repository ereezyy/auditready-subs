import { sendDueReminders } from "@/lib/reminders/run";

async function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  return POST(request);
}

export async function POST(request: Request) {
  if (!(await authorized(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await sendDueReminders();
  return Response.json(result);
}
