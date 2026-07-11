import Link from "next/link";
import { ReactNode } from "react";

import { LeadStatusBadge } from "@/components/Leads/LeadStatusBadge";
import { Offcanvas } from "@/components/ui/Offcanvas";
import { formatDate } from "@/lib/format";
import { Lead } from "@/lib/api";

type LeadDetailOffcanvasProps = {
    lead: Lead | null;
    onClose: () => void;
};

export function LeadDetailOffcanvas({
    lead,
    onClose,
}: LeadDetailOffcanvasProps) {
    return (
        <Offcanvas
            open={!!lead}
            title={lead?.contact_name || "Lead details"}
            onClose={onClose}
        >
            {lead ? (
                <div className="space-y-6">
                    <dl className="grid gap-4 text-sm">
                        <DetailItem
                            label="Phone"
                            value={lead.phone_number || "—"}
                        />
                        <DetailItem
                            label="Status"
                            value={<LeadStatusBadge status={lead.status} />}
                        />
                        <DetailItem
                            label="Campaign"
                            value={
                                lead.campaign_id ? (
                                    <Link
                                        href={`/campaigns/${lead.campaign_id}`}
                                        className="text-zinc-700 hover:underline dark:text-zinc-300"
                                    >
                                        {lead.campaign_name || "Campaign"}
                                    </Link>
                                ) : (
                                    "—"
                                )
                            }
                        />
                        <DetailItem
                            label="Created"
                            value={formatDate(lead.created_at)}
                        />
                    </dl>

                    <section>
                        <h3 className="mb-2 text-sm font-medium text-zinc-500">
                            Summary
                        </h3>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                            {lead.summary}
                        </p>
                    </section>
                </div>
            ) : null}
        </Offcanvas>
    );
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div>
            <dt className="text-zinc-500">{label}</dt>
            <dd className="mt-1 font-medium text-zinc-900 dark:text-zinc-50">
                {value}
            </dd>
        </div>
    );
}
