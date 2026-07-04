"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import {
  AuthButton,
  AuthError,
  AuthField,
  AuthShell,
  AuthSuccess,
} from "@/components/auth-shell";
import { ApiError, authApi } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await authApi.forgotPassword(email);
      setSuccess(response.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to send reset link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Forgot password"
      subtitle="We'll send you a reset link if the account exists"
      footer={
        <Link href="/login" className="font-medium text-zinc-900 dark:text-zinc-100">
          Back to login
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthError message={error} />
        <AuthSuccess message={success} />
        <AuthField
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
        />
        <AuthButton loading={loading}>Send reset link</AuthButton>
      </form>
    </AuthShell>
  );
}
