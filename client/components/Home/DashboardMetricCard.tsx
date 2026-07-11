import { Skeleton } from "@/components/ui/Skeleton";

type DashboardMetricCardProps = {
    label: string;
    value?: number | string;
    hint?: string;
    loading?: boolean;
};

export function DashboardMetricCard({
    label,
    value,
    hint,
    loading = false,
}: DashboardMetricCardProps) {
    return (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-sm text-zinc-500">{label}</p>
            {loading ? (
                <Skeleton className="mt-3 h-8 w-20" />
            ) : (
                <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                    {value ?? 0}
                </p>
            )}
            {hint ? <p className="mt-2 text-xs text-zinc-500">{hint}</p> : null}
        </div>
    );
}
