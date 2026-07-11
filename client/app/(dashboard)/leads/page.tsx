"use client";

import { useEffect } from "react";

import { LeadsTable } from "@/components/Leads/LeadsTable";
import { Alert } from "@/components/ui/Alert";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { LeadStatus } from "@/lib/api";
import { useLeadStore } from "@/stores/lead-store";

const STATUS_OPTIONS: Array<{ value: LeadStatus | ""; label: string }> = [
    { value: "", label: "All statuses" },
    { value: "new_lead", label: "Connected" },
    { value: "voicemail", label: "No answer" },
    { value: "dead", label: "Not connected" },
];

export default function LeadsPage() {
    const {
        leads,
        leadsLoading,
        leadsError,
        leadsPage,
        leadsTotal,
        leadsPageSize,
        statusFilter,
        statistics,
        statisticsLoading,
        fetchLeads,
        fetchStatistics,
        setLeadsPage,
        setStatusFilter,
    } = useLeadStore();

    useEffect(() => {
        fetchLeads();
        fetchStatistics();
    }, [fetchLeads, fetchStatistics]);

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Leads"
                title="Leads"
                description="Call outcomes from outbound campaigns. Status comes from Twilio; summary from ElevenLabs when the agent connected."
            />

            <Alert message={leadsError} />

            <section className="grid gap-4 sm:grid-cols-3">
                <StatCard
                    label="Total leads"
                    value={statistics?.total_leads}
                    loading={statisticsLoading}
                />
                <StatCard
                    label="Connected"
                    value={statistics?.leads_by_status?.new_lead}
                    loading={statisticsLoading}
                />
                <StatCard
                    label="Connection rate"
                    value={
                        statistics
                            ? `${Math.round(statistics.conversion_rate * 100)}%`
                            : undefined
                    }
                    loading={statisticsLoading}
                />
            </section>

            <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    All leads
                </h2>
                <div className="w-48">
                    <Select
                        label=""
                        value={statusFilter}
                        onChange={(event) =>
                            setStatusFilter(
                                event.target.value as LeadStatus | "",
                            )
                        }
                    >
                        {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </Select>
                </div>
            </div>

            <LeadsTable
                leads={leads}
                loading={leadsLoading}
                page={leadsPage}
                pageSize={leadsPageSize}
                total={leadsTotal}
                onPageChange={setLeadsPage}
            />
        </div>
    );
}

function StatCard({
    label,
    value,
    loading,
}: {
    label: string;
    value?: number | string;
    loading: boolean;
}) {
    return (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-sm text-zinc-500">{label}</p>
            {loading ? (
                <Skeleton className="mt-2 h-8 w-16" />
            ) : (
                <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                    {value ?? 0}
                </p>
            )}
        </div>
    );
}
