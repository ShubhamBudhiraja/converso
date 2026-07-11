"use client";

import { useEffect, useState } from "react";

import { Select } from "@/components/ui/Select";
import { Campaign, LeadStatus } from "@/lib/api";
import {
    LEAD_DATE_PRESETS,
    LeadDatePreset,
    getLeadDatePresetLabel,
    todayLocalDateIso,
} from "@/lib/leads";

const STATUS_OPTIONS: Array<{ value: LeadStatus | ""; label: string }> = [
    { value: "", label: "All statuses" },
    { value: "new_lead", label: "Connected" },
    { value: "voicemail", label: "No answer" },
    { value: "dead", label: "Not connected" },
];

type LeadsFiltersProps = {
    searchQuery: string;
    statusFilter: LeadStatus | "";
    campaignFilter: string;
    datePreset: LeadDatePreset;
    customStart: string;
    customEnd: string;
    campaigns: Campaign[];
    campaignsLoading: boolean;
    onSearchChange: (value: string) => void;
    onStatusChange: (value: LeadStatus | "") => void;
    onCampaignChange: (value: string) => void;
    onDatePresetChange: (value: LeadDatePreset) => void;
    onCustomStartChange: (value: string) => void;
    onCustomEndChange: (value: string) => void;
};

export function LeadsFilters({
    searchQuery,
    statusFilter,
    campaignFilter,
    datePreset,
    customStart,
    customEnd,
    campaigns,
    campaignsLoading,
    onSearchChange,
    onStatusChange,
    onCampaignChange,
    onDatePresetChange,
    onCustomStartChange,
    onCustomEndChange,
}: LeadsFiltersProps) {
    const [searchInput, setSearchInput] = useState(searchQuery);

    useEffect(() => {
        setSearchInput(searchQuery);
    }, [searchQuery]);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            if (searchInput !== searchQuery) {
                onSearchChange(searchInput);
            }
        }, 300);

        return () => window.clearTimeout(timeout);
    }, [searchInput, onSearchChange, searchQuery]);

    return (
        <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                <div className="min-w-0 flex-1">
                    <label
                        htmlFor="leads-search"
                        className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                    >
                        Search
                    </label>
                    <input
                        id="leads-search"
                        type="search"
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        placeholder="Name or phone number"
                        className="input"
                    />
                </div>
                <div className="w-full lg:w-48">
                    <Select
                        label="Status"
                        value={statusFilter}
                        onChange={(event) =>
                            onStatusChange(
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
                <div className="w-full lg:w-56">
                    <Select
                        label="Campaign"
                        value={campaignFilter}
                        onChange={(event) =>
                            onCampaignChange(event.target.value)
                        }
                        disabled={campaignsLoading}
                    >
                        <option value="">All campaigns</option>
                        {campaigns.map((campaign) => (
                            <option key={campaign.id} value={campaign.id}>
                                {campaign.name}
                            </option>
                        ))}
                    </Select>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Date range
                </span>
                {LEAD_DATE_PRESETS.map((preset) => (
                    <button
                        key={preset}
                        type="button"
                        onClick={() => onDatePresetChange(preset)}
                        className={`cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                            datePreset === preset
                                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        }`}
                    >
                        {getLeadDatePresetLabel(preset)}
                    </button>
                ))}
                {datePreset === "custom" ? (
                    <>
                        <input
                            type="date"
                            value={customStart}
                            max={customEnd}
                            onChange={(event) =>
                                onCustomStartChange(event.target.value)
                            }
                            className="input w-auto"
                            aria-label="Start date"
                        />
                        <input
                            type="date"
                            value={customEnd}
                            min={customStart}
                            max={todayLocalDateIso()}
                            onChange={(event) =>
                                onCustomEndChange(event.target.value)
                            }
                            className="input w-auto"
                            aria-label="End date"
                        />
                    </>
                ) : null}
            </div>
        </div>
    );
}
