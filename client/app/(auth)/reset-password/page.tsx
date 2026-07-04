"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";

import { AuthShell } from "@/components/AuthShell";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError, authApi } from "@/lib/api";

type ResetPasswordForm = {
    password: string;
    confirmPassword: string;
};

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token") ?? "";

    const [error, setError] = useState<string | null>(
        token ? null : "Reset token is missing. Use the link from your email.",
    );
    const [success, setSuccess] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ResetPasswordForm>({
        defaultValues: { password: "", confirmPassword: "" },
    });

    async function onSubmit(data: ResetPasswordForm) {
        setError(null);
        setSuccess(null);

        if (data.password !== data.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        try {
            const response = await authApi.resetPassword(token, data.password);
            setSuccess(response.message);
            setTimeout(() => router.push("/login"), 1500);
        } catch (err) {
            setError(
                err instanceof ApiError
                    ? err.message
                    : "Unable to reset password",
            );
        }
    }

    return (
        <AuthShell
            title="Reset password"
            subtitle="Choose a new password for your account"
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
                    id="password"
                    label="New password"
                    type="password"
                    autoComplete="new-password"
                    error={errors.password?.message}
                    {...register("password", {
                        required: "Password is required",
                        minLength: {
                            value: 8,
                            message: "Password must be at least 8 characters",
                        },
                    })}
                />
                <Input
                    id="confirm-password"
                    label="Confirm password"
                    type="password"
                    autoComplete="new-password"
                    error={errors.confirmPassword?.message}
                    {...register("confirmPassword", {
                        required: "Please confirm your password",
                    })}
                />
                <Button
                    type="submit"
                    disabled={isSubmitting || !token}
                    className="flex w-full justify-center py-2.5"
                >
                    {isSubmitting ? "Please wait..." : "Reset password"}
                </Button>
            </form>
        </AuthShell>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense
            fallback={
                <div className="p-8 text-center text-sm text-zinc-500">
                    Loading...
                </div>
            }
        >
            <ResetPasswordForm />
        </Suspense>
    );
}
