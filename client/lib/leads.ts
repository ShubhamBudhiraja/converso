import {
    ChartRangePreset,
    getRangeForPreset,
    toLocalDateKey,
} from "@/lib/dashboard";

export type LeadDatePreset = "all" | ChartRangePreset;

function todayLocalIso() {
    return toLocalDateKey(new Date());
}

function daysAgoLocalIso(days: number) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return toLocalDateKey(date);
}

export function getLeadDateRange(
    preset: LeadDatePreset,
    customRange: { start: string; end: string },
) {
    if (preset === "all") {
        return { start_date: undefined, end_date: undefined };
    }

    const range = getRangeForPreset(preset, customRange);
    return {
        start_date: toLocalDateKey(range.start),
        end_date: toLocalDateKey(range.end),
    };
}

export function getDefaultLeadCustomRange() {
    return {
        start: daysAgoLocalIso(29),
        end: todayLocalIso(),
    };
}

export const LEAD_DATE_PRESETS: LeadDatePreset[] = [
    "all",
    "week",
    "month",
    "year",
    "custom",
];

export function getLeadDatePresetLabel(preset: LeadDatePreset) {
    if (preset === "all") return "All time";
    const labels: Record<ChartRangePreset, string> = {
        today: "Today",
        week: "This week",
        month: "This month",
        year: "This year",
        custom: "Custom range",
    };
    return labels[preset];
}

export function todayLocalDateIso() {
    return todayLocalIso();
}
