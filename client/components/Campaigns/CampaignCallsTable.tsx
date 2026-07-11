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
import { CampaignCall } from "@/lib/api";

type CampaignCallsTableProps = {
    calls: CampaignCall[];
    loading: boolean;
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
};

export function CampaignCallsTable({
    calls,
    loading,
    page,
    pageSize,
    total,
    onPageChange,
}: CampaignCallsTableProps) {
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
                    <TableHeaderCell>Contact</TableHeaderCell>
                    <TableHeaderCell>Phone</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Duration</TableHeaderCell>
                    <TableHeaderCell>Summary</TableHeaderCell>
                    <TableHeaderCell>Updated</TableHeaderCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {loading ? (
                    <TableSkeletonRows columns={6} rows={4} />
                ) : calls.length === 0 ? (
                    <TableEmptyState
                        colSpan={6}
                        emptyMessage="No calls yet. Start the campaign to initiate outbound calls."
                    />
                ) : (
                    calls.map((call) => (
                        <TableRow key={call.id}>
                            <TableCell className="font-medium text-zinc-900 dark:text-zinc-50">
                                {call.contact_name || "—"}
                            </TableCell>
                            <TableCell>{call.phone_number}</TableCell>
                            <TableCell className="capitalize">
                                {call.status.replace(/_/g, " ")}
                            </TableCell>
                            <TableCell>
                                {call.duration_seconds != null
                                    ? `${call.duration_seconds}s`
                                    : "—"}
                            </TableCell>
                            <TableCell className="max-w-xs truncate text-zinc-600 dark:text-zinc-400">
                                {call.transcription_summary ||
                                    call.error_message ||
                                    "—"}
                            </TableCell>
                            <TableCell className="text-zinc-600 dark:text-zinc-400">
                                {formatDate(call.updated_at)}
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );
}
