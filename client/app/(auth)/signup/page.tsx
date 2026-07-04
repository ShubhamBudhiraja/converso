"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { AuthShell } from "@/components/AuthShell";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError, authApi } from "@/lib/api";
import { useUserStore } from "@/stores/user-store";

type SignupForm = {
    email: string;
    password: string;
};

export default function SignupPage() {
    const router = useRouter();
    const fetchUser = useUserStore((state) => state.fetchUser);
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<SignupForm>({
        defaultValues: { email: "", password: "" },
    });

    async function onSubmit(data: SignupForm) {
        setError(null);
        try {
            await authApi.signup(data.email, data.password);
            await fetchUser();
            router.push("/home");
        } catch (err) {
            setError(
                err instanceof ApiError
                    ? err.message
                    : "Unable to create account",
            );
        }
    }

    return (
        <AuthShell
            title="Create account"
            subtitle="Start using Converso"
            footer={
                <>
                    Already have an account?{" "}
                    <Link
                        href="/login"
                        className="font-medium text-zinc-900 dark:text-zinc-100"
                    >
                        Log in
                    </Link>
                </>
            }
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Alert message={error} />
                <Input
                    id="email"
                    label="Email"
                    type="email"
                    autoComplete="email"
                    error={errors.email?.message}
                    {...register("email", { required: "Email is required" })}
                />
                <Input
                    id="password"
                    label="Password"
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
                <p className="text-xs text-zinc-500">
                    Password must be at least 8 characters.
                </p>
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full justify-center py-2.5"
                >
                    {isSubmitting ? "Please wait..." : "Sign up"}
                </Button>
            </form>
        </AuthShell>
    );
}
