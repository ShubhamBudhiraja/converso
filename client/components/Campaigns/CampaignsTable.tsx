import { useRouter } from "next/navigation";

import { CampaignStatusBadge } from "@/components/Campaigns/CampaignStatusBadge";
import { PencilIcon, TrashIcon } from "@/components/Icons";
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
import { canEditCampaign } from "@/lib/campaigns";
import { Campaign } from "@/lib/api";

type CampaignsTableProps = {
    campaigns: Campaign[];
    loading: boolean;
    onDelete: (campaign: Campaign) => void;
    onEdit: (campaign: Campaign) => void;
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
    onEdit,
    page,
    pageSize,
    total,
    onPageChange,
    actionLoading,
}: CampaignsTableProps) {
    const router = useRouter();

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
                        <TableRow
                            key={campaign.id}
                            onClick={() =>
                                router.push(`/campaigns/${campaign.id}`)
                            }
                        >
                            <TableCell className="font-medium text-zinc-900 dark:text-zinc-50">
                                {campaign.name}
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
                            <TableCell onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-end gap-1">
                                    {canEditCampaign(campaign) && (
                                        <Button
                                            variant="icon"
                                            title="Edit campaign"
                                            aria-label="Edit campaign"
                                            disabled={actionLoading}
                                            onClick={() => onEdit(campaign)}
                                        >
                                            <PencilIcon />
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
