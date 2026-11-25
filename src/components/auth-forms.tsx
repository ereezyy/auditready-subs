"use client";

import { BoundForm } from "@/components/bound-form";
import { SubmitButton } from "@/components/submit-button";
import { Input, Label } from "@/components/ui/input";
import { loginAction, signupAction } from "@/server/actions";

export function LoginForm({ demoHint }: { demoHint: string | null }) {
  return (
    <BoundForm action={loginAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
      {demoHint ? <p className="text-sm leading-6 text-ink-soft">{demoHint}</p> : null}
    </BoundForm>
  );
}

export function SignupForm() {
  return (
    <BoundForm action={signupAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="contactName">Your name</Label>
        <Input id="contactName" name="contactName" autoComplete="name" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="companyName">Company</Label>
        <Input id="companyName" name="companyName" autoComplete="organization" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <SubmitButton variant="copper" pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </BoundForm>
  );
}
