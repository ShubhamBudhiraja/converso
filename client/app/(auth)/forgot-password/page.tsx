"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { AuthShell } from "@/components/AuthShell";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError, authApi } from "@/lib/api";

type ForgotPasswordForm = {
    email: string;
};

export default function ForgotPasswordPage() {
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ForgotPasswordForm>({
        defaultValues: { email: "" },
    });

    async function onSubmit(data: ForgotPasswordForm) {
        setError(null);
        setSuccess(null);
        try {
            const response = await authApi.forgotPassword(data.email);
            setSuccess(response.message);
        } catch (err) {
            setError(
                err instanceof ApiError
                    ? err.message
                    : "Unable to send reset link",
            );
        }
    }

    return (
        <AuthShell
            title="Forgot password"
            subtitle="We'll send you a reset link if the account exists"
            footer={
                <Link
                    href="/login"
                    className="font-medium text-zinc-900 dark:text-zinc-100"
                >
                    Back to login
                </Link>
            }
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Alert message={error} />
                <Alert message={success} variant="success" />
                <Input
                    id="email"
                    label="Email"
                    type="email"
                    autoComplete="email"
                    error={errors.email?.message}
                    {...register("email", { required: "Email is required" })}
                />
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full justify-center py-2.5"
                >
                    {isSubmitting ? "Please wait..." : "Send reset link"}
                </Button>
            </form>
        </AuthShell>
    );
}
