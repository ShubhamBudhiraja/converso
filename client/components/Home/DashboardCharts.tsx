"use client";

import { useMemo, useState } from "react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import { Skeleton } from "@/components/ui/Skeleton";
import {
    ChartRangePreset,
    getLeadActivityForRange,
    getRangeForPreset,
    getRangeLabel,
    toLocalDateKey,
} from "@/lib/dashboard";
import { LeadStatistics } from "@/lib/api";

import { DashboardSection } from "./DashboardSection";

type DashboardChartsProps = {
    statistics: LeadStatistics | null;
    loading: boolean;
};

const RANGE_OPTIONS: ChartRangePreset[] = ["week", "month", "year", "custom"];

const CHART_GRID = "var(--chart-grid, #e4e4e7)";
const CHART_AXIS = "var(--chart-axis, #71717a)";
const CHART_ACCENT = "#10b981";

function todayLocalIso() {
    return toLocalDateKey(new Date());
}

function daysAgoLocalIso(days: number) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return toLocalDateKey(date);
}

export function DashboardCharts({ statistics, loading }: DashboardChartsProps) {
    const [preset, setPreset] = useState<ChartRangePreset>("month");
    const [customStart, setCustomStart] = useState(daysAgoLocalIso(29));
    const [customEnd, setCustomEnd] = useState(todayLocalIso());

    const range = useMemo(
        () =>
            getRangeForPreset(preset, {
                start: customStart,
                end: customEnd,
            }),
        [preset, customStart, customEnd],
    );

    const activityData = useMemo(
        () => getLeadActivityForRange(statistics, range, preset),
        [statistics, range, preset],
    );

    const totalInRange = activityData.reduce(
        (sum, point) => sum + point.count,
        0,
    );
    const hasLeadData = (statistics?.leads_over_time.length ?? 0) > 0;

    const filterActions = (
        <>
            {RANGE_OPTIONS.map((option) => (
                <button
                    key={option}
                    type="button"
                    onClick={() => setPreset(option)}
                    className={`cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                        preset === option
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                >
                    {getRangeLabel(option)}
                </button>
            ))}
            {preset === "custom" ? (
                <>
                    <input
                        type="date"
                        value={customStart}
                        max={customEnd}
                        onChange={(event) => setCustomStart(event.target.value)}
                        className="input w-auto"
                        aria-label="Start date"
                    />
                    <input
                        type="date"
                        value={customEnd}
                        min={customStart}
                        max={todayLocalIso()}
                        onChange={(event) => setCustomEnd(event.target.value)}
                        className="input w-auto"
                        aria-label="End date"
                    />
                </>
            ) : null}
        </>
    );

    return (
        <DashboardSection
            title="Lead activity"
            description={`${totalInRange} leads in selected range`}
            actions={filterActions}
        >
            {loading ? (
                <Skeleton className="h-72 w-full" />
            ) : !hasLeadData ? (
                <EmptyChartMessage message="Lead activity will appear after your first campaign calls complete." />
            ) : (
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={activityData}
                            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient
                                    id="leadActivityFill"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop
                                        offset="5%"
                                        stopColor={CHART_ACCENT}
                                        stopOpacity={0.35}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor={CHART_ACCENT}
                                        stopOpacity={0.02}
                                    />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                stroke={CHART_GRID}
                                strokeDasharray="3 3"
                                vertical={false}
                            />
                            <XAxis
                                dataKey="label"
                                tick={{ fill: CHART_AXIS, fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                                minTickGap={24}
                            />
                            <YAxis
                                allowDecimals={false}
                                width={28}
                                tick={{ fill: CHART_AXIS, fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: "0.75rem",
                                    border: "1px solid #e4e4e7",
                                    background: "#ffffff",
                                }}
                                labelStyle={{
                                    color: "#18181b",
                                    fontWeight: 600,
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="count"
                                name="Leads"
                                stroke={CHART_ACCENT}
                                fill="url(#leadActivityFill)"
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </DashboardSection>
    );
}

function EmptyChartMessage({ message }: { message: string }) {
    return (
        <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-zinc-200 px-6 text-center text-sm text-zinc-500 dark:border-zinc-800">
            {message}
        </div>
    );
}
