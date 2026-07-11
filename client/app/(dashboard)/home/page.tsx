"use client";

import { useEffect, useState } from "react";

import { DashboardCampaignsTable } from "@/components/Home/DashboardCampaignsTable";
import { DashboardCharts } from "@/components/Home/DashboardCharts";
import { DashboardLeadsTable } from "@/components/Home/DashboardLeadsTable";
import { DashboardMetricCard } from "@/components/Home/DashboardMetricCard";
import { Alert } from "@/components/ui/Alert";
import { PageHeader } from "@/components/ui/PageHeader";
import { Campaign, Lead, LeadStatistics, campaignApi, leadsApi } from "@/lib/api";
import { countLeadsThisMonth, isThisMonth } from "@/lib/dashboard";

type DashboardData = {
    statistics: LeadStatistics | null;
    monthLeads: Lead[];
    campaigns: Campaign[];
    campaignsTotal: number;
    activeCampaigns: number;
};

const EMPTY_DATA: DashboardData = {
    statistics: null,
    monthLeads: [],
    campaigns: [],
    campaignsTotal: 0,
    activeCampaigns: 0,
};

export default function HomePage() {
    const [data, setData] = useState<DashboardData>(EMPTY_DATA);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function loadDashboard() {
            setLoading(true);
            setError(null);

            try {
                const [statistics, leadsResponse, campaignsPreview, campaignsSummary] =
                    await Promise.all([
                        leadsApi.getStatistics(),
                        leadsApi.listLeads({ page: 1, page_size: 20 }),
                        campaignApi.listCampaigns({ page: 1, page_size: 5 }),
                        campaignApi.listCampaigns({ page: 1, page_size: 100 }),
                    ]);

                if (cancelled) return;

                const monthLeads = leadsResponse.items
                    .filter((lead) => isThisMonth(lead.created_at))
                    .slice(0, 5);

                const activeCampaigns = campaignsSummary.items.filter((campaign) =>
                    ["scheduled", "running"].includes(campaign.status),
                ).length;

                setData({
                    statistics,
                    monthLeads,
                    campaigns: campaignsPreview.items,
                    campaignsTotal: campaignsSummary.total,
                    activeCampaigns,
                });
            } catch {
                if (!cancelled) {
                    setError("Failed to load dashboard data. Please refresh the page.");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadDashboard();

        return () => {
            cancelled = true;
        };
    }, []);

    const monthLeadCount = countLeadsThisMonth(data.statistics);
    const connectionRate = data.statistics
        ? `${Math.round(data.statistics.conversion_rate * 100)}%`
        : "0%";

    return (
        <div className="space-y-8">
            <PageHeader
                eyebrow="Home"
                title="Dashboard"
                description="A snapshot of your outbound calling pipeline and lead performance."
            />

            <Alert message={error} />

            <section className="grid gap-4 sm:grid-cols-3">
                <DashboardMetricCard
                    label="Leads this month"
                    value={monthLeadCount}
                    hint="Created from completed campaign calls"
                    loading={loading}
                />
                <DashboardMetricCard
                    label="Connection rate"
                    value={connectionRate}
                    hint="Connected leads vs total leads"
                    loading={loading}
                />
                <DashboardMetricCard
                    label="Active campaigns"
                    value={data.activeCampaigns}
                    hint={`${data.campaignsTotal} total campaigns`}
                    loading={loading}
                />
            </section>

            <DashboardCharts statistics={data.statistics} loading={loading} />

            <section className="grid gap-6 xl:grid-cols-2">
                <DashboardLeadsTable leads={data.monthLeads} loading={loading} />
                <DashboardCampaignsTable campaigns={data.campaigns} loading={loading} />
            </section>
        </div>
    );
}
