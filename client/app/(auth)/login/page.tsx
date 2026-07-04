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

type LoginForm = {
    email: string;
    password: string;
};

export default function LoginPage() {
    const router = useRouter();
    const fetchUser = useUserStore((state) => state.fetchUser);
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginForm>({
        defaultValues: { email: "", password: "" },
    });

    async function onSubmit(data: LoginForm) {
        setError(null);
        try {
            await authApi.login(data.email, data.password);
            await fetchUser();
            router.push("/home");
        } catch (err) {
            setError(
                err instanceof ApiError ? err.message : "Unable to log in",
            );
        }
    }

    return (
        <AuthShell
            title="Welcome back"
            subtitle="Log in to your account"
            footer={
                <>
                    Don&apos;t have an account?{" "}
                    <Link
                        href="/signup"
                        className="font-medium text-zinc-900 dark:text-zinc-100"
                    >
                        Sign up
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
                    autoComplete="current-password"
                    error={errors.password?.message}
                    {...register("password", {
                        required: "Password is required",
                    })}
                />
                <div className="text-right">
                    <Link
                        href="/forgot-password"
                        className="link-muted text-sm"
                    >
                        Forgot password?
                    </Link>
                </div>
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full justify-center py-2.5"
                >
                    {isSubmitting ? "Please wait..." : "Log in"}
                </Button>
            </form>
        </AuthShell>
    );
}
