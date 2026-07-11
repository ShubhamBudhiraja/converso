import { Campaign } from "@/lib/api";

export const CAMPAIGN_EDIT_LOCK_MS = 5 * 60 * 1000;

export function canEditCampaign(campaign: Campaign) {
    if (campaign.status !== "scheduled") {
        return false;
    }

    const scheduledAt = new Date(campaign.scheduled_at).getTime();
    const lockAt = scheduledAt - CAMPAIGN_EDIT_LOCK_MS;
    return Date.now() < lockAt;
}

export function toDatetimeLocalValue(iso: string) {
    const date = new Date(iso);
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60_000);
    return local.toISOString().slice(0, 16);
}
