import Link from "next/link";

import { CampaignStatusBadge } from "@/components/Campaigns/CampaignStatusBadge";
import { TrashIcon } from "@/components/Icons";
import { Button } from "@/components/ui/Button";
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
import { Campaign } from "@/lib/api";

type CampaignsTableProps = {
    campaigns: Campaign[];
    loading: boolean;
    onDelete: (campaign: Campaign) => void;
    onCancel: (campaign: Campaign) => void;
    onStart: (campaign: Campaign) => void;
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    actionLoading: boolean;
};

export function CampaignsTable({
    campaigns,
    loading,
    onDelete,
    onCancel,
    onStart,
    page,
    pageSize,
    total,
    onPageChange,
    actionLoading,
}: CampaignsTableProps) {
    return (
        <Table
            toolbar={
                <TableToolbar page={page} pageSize={pageSize} total={total} />
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
                    <TableHeaderCell>Name</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Caller agent</TableHeaderCell>
                    <TableHeaderCell>Contacts</TableHeaderCell>
                    <TableHeaderCell>Calls</TableHeaderCell>
                    <TableHeaderCell>Scheduled</TableHeaderCell>
                    <TableHeaderCell align="right">Actions</TableHeaderCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {loading ? (
                    <TableSkeletonRows columns={7} rows={4} />
                ) : campaigns.length === 0 ? (
                    <TableEmptyState
                        colSpan={7}
                        emptyMessage="No campaigns yet. Create one to start outbound calling."
                    />
                ) : (
                    campaigns.map((campaign) => (
                        <TableRow key={campaign.id}>
                            <TableCell>
                                <Link
                                    href={`/campaigns/${campaign.id}`}
                                    className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                                >
                                    {campaign.name}
                                </Link>
                            </TableCell>
                            <TableCell>
                                <CampaignStatusBadge status={campaign.status} />
                            </TableCell>
                            <TableCell className="text-zinc-700 dark:text-zinc-300">
                                {campaign.caller_agent_name || "—"}
                            </TableCell>
                            <TableCell>{campaign.total_contacts}</TableCell>
                            <TableCell>
                                {campaign.calls_completed}/
                                {campaign.calls_initiated}
                            </TableCell>
                            <TableCell className="text-zinc-600 dark:text-zinc-400">
                                {formatDate(campaign.scheduled_at)}
                            </TableCell>
                            <TableCell>
                                <div className="flex justify-end gap-1">
                                    {(campaign.status === "scheduled" ||
                                        campaign.status === "running") && (
                                        <Button
                                            variant="secondary"
                                            disabled={actionLoading}
                                            onClick={() => onStart(campaign)}
                                        >
                                            {campaign.status === "running"
                                                ? "Resume"
                                                : "Start now"}
                                        </Button>
                                    )}
                                    {(campaign.status === "scheduled" ||
                                        campaign.status === "running") && (
                                        <Button
                                            variant="secondary"
                                            disabled={actionLoading}
                                            onClick={() => onCancel(campaign)}
                                        >
                                            Cancel
                                        </Button>
                                    )}
                                    {campaign.status !== "running" && (
                                        <Button
                                            variant="icon-danger"
                                            title="Delete campaign"
                                            aria-label="Delete campaign"
                                            onClick={() => onDelete(campaign)}
                                        >
                                            <TrashIcon />
                                        </Button>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );
}
