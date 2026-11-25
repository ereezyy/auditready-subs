import "server-only";
import { Resend } from "resend";
import { emailMode } from "@/lib/env";
import { getStore } from "@/lib/store";

export type EmailMessage = {
  contractorId: string | null;
  toEmail: string;
  ccEmail: string | null;
  subject: string;
  body: string;
};

export async function sendEmail(message: EmailMessage): Promise<{ transport: "console" | "resend" }> {
  const store = getStore();
  await store.addOutbox(message);
  if (emailMode() === "console") {
    console.log(
      `\n[auditready email]\nTo: ${message.toEmail}\nCc: ${message.ccEmail ?? "(none)"}\nSubject: ${message.subject}\n\n${message.body}\n`,
    );
    return { transport: "console" };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const cc = message.ccEmail
    ? message.ccEmail.split(",").map((item) => item.trim()).filter(Boolean)
    : undefined;
  const result = await resend.emails.send({
    from: process.env.EMAIL_FROM || "AuditReady <certificates@auditready.local>",
    to: message.toEmail,
    cc,
    subject: message.subject,
    text: message.body,
  });
  if (result.error) {
    throw new Error(result.error.message);
  }
  return { transport: "resend" };
}
