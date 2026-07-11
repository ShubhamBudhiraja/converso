import Link from "next/link";
import { useState } from "react";

import { LeadDetailOffcanvas } from "@/components/Leads/LeadDetailOffcanvas";
import { LeadStatusBadge } from "@/components/Leads/LeadStatusBadge";
import { TableSkeletonRows } from "@/components/ui/Skeleton";
import { TablePaginationFooter } from "@/components/ui/TablePaginationFooter";
import { TableToolbar } from "@/components/ui/TableToolbar";
import {
    Table,
    TableBody,
    TableCell,
    TableEmptyState,
    TableHead,
    TableHeaderCell,
    TableRow,
} from "@/components/ui/Table";
import { formatDate } from "@/lib/format";
import { Lead } from "@/lib/api";

type LeadsTableProps = {
    leads: Lead[];
    loading: boolean;
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
};

export function LeadsTable({
    leads,
    loading,
    page,
    pageSize,
    total,
    onPageChange,
}: LeadsTableProps) {
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

    return (
        <>
            <Table
                toolbar={
                    <TableToolbar
                        page={page}
                        pageSize={pageSize}
                        total={total}
                    />
                }
                footer={
                    <TablePaginationFooter
                        page={page}
                        pageSize={pageSize}
                        total={total}
                        onPageChange={onPageChange}
                    />
                }
            >
                <TableHead>
                    <TableRow>
                        <TableHeaderCell>Contact</TableHeaderCell>
                        <TableHeaderCell>Phone</TableHeaderCell>
                        <TableHeaderCell>Status</TableHeaderCell>
                        <TableHeaderCell>Campaign</TableHeaderCell>
                        <TableHeaderCell>Summary</TableHeaderCell>
                        <TableHeaderCell>Created</TableHeaderCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {loading ? (
                        <TableSkeletonRows columns={6} rows={4} />
                    ) : leads.length === 0 ? (
                        <TableEmptyState
                            colSpan={6}
                            emptyMessage="No leads yet. Leads are created when campaign calls reach a final status."
                        />
                    ) : (
                        leads.map((lead) => (
                            <TableRow
                                key={lead.id}
                                onClick={() => setSelectedLead(lead)}
                            >
                                <TableCell className="font-medium text-zinc-900 dark:text-zinc-50">
                                    {lead.contact_name || "—"}
                                </TableCell>
                                <TableCell>
                                    {lead.phone_number || "—"}
                                </TableCell>
                                <TableCell>
                                    <LeadStatusBadge status={lead.status} />
                                </TableCell>
                                <TableCell
                                    onClick={(event) => event.stopPropagation()}
                                >
                                    {lead.campaign_id ? (
                                        <Link
                                            href={`/campaigns/${lead.campaign_id}`}
                                            className="text-zinc-700 hover:underline dark:text-zinc-300"
                                        >
                                            {lead.campaign_name || "Campaign"}
                                        </Link>
                                    ) : (
                                        "—"
                                    )}
                                </TableCell>
                                <TableCell className="max-w-sm truncate text-zinc-600 dark:text-zinc-400">
                                    {lead.summary}
                                </TableCell>
                                <TableCell className="text-zinc-600 dark:text-zinc-400">
                                    {formatDate(lead.created_at)}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            <LeadDetailOffcanvas
                lead={selectedLead}
                onClose={() => setSelectedLead(null)}
            />
        </>
    );
}
