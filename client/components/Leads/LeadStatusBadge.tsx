import { LeadStatus } from "@/lib/api";

const STATUS_STYLES: Record<string, string> = {
    new_lead:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    voicemail:
        "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    dead: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

const STATUS_LABELS: Record<string, string> = {
    new_lead: "Connected",
    voicemail: "No answer",
    dead: "Not connected",
};

export function LeadStatusBadge({ status }: { status: LeadStatus | string }) {
    return (
        <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                STATUS_STYLES[status] ?? STATUS_STYLES.dead
            }`}
        >
            {STATUS_LABELS[status] ?? status.replace(/_/g, " ")}
        </span>
    );
}
