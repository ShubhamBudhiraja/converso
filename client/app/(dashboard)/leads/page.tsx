"use client";

import { useEffect, useState } from "react";

import { LeadsFilters } from "@/components/Leads/LeadsFilters";
import { LeadsTable } from "@/components/Leads/LeadsTable";
import { Alert } from "@/components/ui/Alert";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { Campaign, campaignApi } from "@/lib/api";
import { useLeadStore } from "@/stores/lead-store";

export default function LeadsPage() {
    const {
        leads,
        leadsLoading,
        leadsError,
        leadsPage,
        leadsTotal,
        leadsPageSize,
        searchQuery,
        statusFilter,
        campaignFilter,
        datePreset,
        customStart,
        customEnd,
        statistics,
        statisticsLoading,
        fetchLeads,
        fetchStatistics,
        setLeadsPage,
        setSearchQuery,
        setStatusFilter,
        setCampaignFilter,
        setDatePreset,
        setCustomStart,
        setCustomEnd,
    } = useLeadStore();

    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [campaignsLoading, setCampaignsLoading] = useState(true);

    useEffect(() => {
        fetchLeads();
        fetchStatistics();
    }, [fetchLeads, fetchStatistics]);

    useEffect(() => {
        let cancelled = false;

        async function loadCampaigns() {
            setCampaignsLoading(true);
            try {
                const data = await campaignApi.listCampaigns({
                    page: 1,
                    page_size: 100,
                });
                if (!cancelled) {
                    setCampaigns(data.items);
                }
            } catch {
                if (!cancelled) {
                    setCampaigns([]);
                }
            } finally {
                if (!cancelled) {
                    setCampaignsLoading(false);
                }
            }
        }

        loadCampaigns();

        return () => {
            cancelled = true;
        };
    }, []);

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

            <LeadsFilters
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                campaignFilter={campaignFilter}
                datePreset={datePreset}
                customStart={customStart}
                customEnd={customEnd}
                campaigns={campaigns}
                campaignsLoading={campaignsLoading}
                onSearchChange={setSearchQuery}
                onStatusChange={setStatusFilter}
                onCampaignChange={setCampaignFilter}
                onDatePresetChange={setDatePreset}
                onCustomStartChange={setCustomStart}
                onCustomEndChange={setCustomEnd}
            />

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
