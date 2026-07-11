import { LeadStatistics } from "@/lib/api";

export type ChartRangePreset = "today" | "week" | "month" | "year" | "custom";

export type ChartDateRange = {
    start: Date;
    end: Date;
};

export function toLocalDateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function normalizeDateKey(value: string) {
    return value.slice(0, 10);
}

export function getCurrentMonthKey(date = new Date()) {
    return toLocalDateKey(date).slice(0, 7);
}

export function isThisMonth(dateValue: string, reference = new Date()) {
    const date = new Date(dateValue);
    return (
        date.getFullYear() === reference.getFullYear() &&
        date.getMonth() === reference.getMonth()
    );
}

export function countLeadsThisMonth(statistics: LeadStatistics | null) {
    if (!statistics) return 0;
    const monthKey = getCurrentMonthKey();
    return statistics.leads_over_time
        .filter((item) => normalizeDateKey(item.date).startsWith(monthKey))
        .reduce((sum, item) => sum + item.count, 0);
}

function parseLocalDate(dateString: string) {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function startOfWeek(date: Date) {
    const next = startOfDay(date);
    const day = next.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    next.setDate(next.getDate() + diff);
    return next;
}

function startOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfYear(date: Date) {
    return new Date(date.getFullYear(), 0, 1);
}

export function getRangeForPreset(
    preset: ChartRangePreset,
    customRange?: { start: string; end: string },
    reference = new Date(),
): ChartDateRange {
    const today = startOfDay(reference);

    switch (preset) {
        case "today":
            return { start: today, end: endOfDay(reference) };
        case "week":
            return { start: startOfWeek(reference), end: endOfDay(reference) };
        case "month":
            return { start: startOfMonth(reference), end: endOfDay(reference) };
        case "year":
            return { start: startOfYear(reference), end: endOfDay(reference) };
        case "custom": {
            const start = customRange?.start
                ? startOfDay(parseLocalDate(customRange.start))
                : today;
            const end = customRange?.end
                ? endOfDay(parseLocalDate(customRange.end))
                : endOfDay(reference);
            return start <= end ? { start, end } : { start: end, end: start };
        }
    }
}

export function getRangeLabel(preset: ChartRangePreset) {
    const labels: Record<ChartRangePreset, string> = {
        today: "Today",
        week: "This week",
        month: "This month",
        year: "This year",
        custom: "Custom range",
    };
    return labels[preset];
}

function formatAxisLabel(date: Date, spanDays: number) {
    if (spanDays > 90) {
        return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
    }
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function buildCountsByDate(statistics: LeadStatistics) {
    const countsByDate = new Map<string, number>();
    for (const item of statistics.leads_over_time) {
        const key = normalizeDateKey(item.date);
        countsByDate.set(key, (countsByDate.get(key) ?? 0) + item.count);
    }
    return countsByDate;
}

export function getLeadActivityForRange(
    statistics: LeadStatistics | null,
    range: ChartDateRange,
    preset: ChartRangePreset,
) {
    if (!statistics) return [];

    const countsByDate = buildCountsByDate(statistics);
    const spanDays =
        Math.floor((range.end.getTime() - range.start.getTime()) / 86_400_000) + 1;

    if (preset === "year" || spanDays > 90) {
        const monthly = new Map<string, { date: string; label: string; count: number }>();
        const cursor = startOfDay(range.start);

        while (cursor <= range.end) {
            const dateKey = toLocalDateKey(cursor);
            const monthKey = dateKey.slice(0, 7);
            const existing = monthly.get(monthKey) ?? {
                date: monthKey,
                label: cursor.toLocaleDateString(undefined, {
                    month: "short",
                    year: "numeric",
                }),
                count: 0,
            };
            existing.count += countsByDate.get(dateKey) ?? 0;
            monthly.set(monthKey, existing);
            cursor.setDate(cursor.getDate() + 1);
        }

        return Array.from(monthly.values());
    }

    const points: Array<{ date: string; label: string; count: number }> = [];
    const cursor = startOfDay(range.start);

    while (cursor <= range.end) {
        const dateKey = toLocalDateKey(cursor);
        points.push({
            date: dateKey,
            label: formatAxisLabel(cursor, spanDays),
            count: countsByDate.get(dateKey) ?? 0,
        });
        cursor.setDate(cursor.getDate() + 1);
    }

    return points;
}

export function countLeadsInRange(statistics: LeadStatistics | null, range: ChartDateRange) {
    if (!statistics) return 0;

    const startKey = toLocalDateKey(range.start);
    const endKey = toLocalDateKey(range.end);

    return statistics.leads_over_time
        .filter((item) => {
            const key = normalizeDateKey(item.date);
            return key >= startKey && key <= endKey;
        })
        .reduce((sum, item) => sum + item.count, 0);
}
