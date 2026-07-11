import { DownloadIcon, PencilIcon, TrashIcon } from "@/components/Icons";
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
import { ContactList } from "@/lib/api";

type ContactListsTableProps = {
    lists: ContactList[];
    loading: boolean;
    onEdit: (list: ContactList) => void;
    onDownload: (list: ContactList) => void;
    onDelete: (list: ContactList) => void;
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
};

export function ContactListsTable({
    lists,
    loading,
    onEdit,
    onDownload,
    onDelete,
    page,
    pageSize,
    total,
    onPageChange,
}: ContactListsTableProps) {
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
                    <TableHeaderCell>Contacts</TableHeaderCell>
                    <TableHeaderCell>Failed rows</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Created</TableHeaderCell>
                    <TableHeaderCell align="right">Actions</TableHeaderCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {loading ? (
                    <TableSkeletonRows columns={6} rows={4} />
                ) : lists.length === 0 ? (
                    <TableEmptyState
                        colSpan={6}
                        emptyMessage="No contact lists yet. Import a CSV to get started."
                    />
                ) : (
                    lists.map((list) => (
                        <TableRow key={list.id}>
                            <TableCell className="font-medium text-zinc-900 dark:text-zinc-50">
                                {list.name}
                            </TableCell>
                            <TableCell>{list.total_contacts}</TableCell>
                            <TableCell>{list.failed_contacts}</TableCell>
                            <TableCell className="capitalize">
                                {list.status}
                            </TableCell>
                            <TableCell className="text-zinc-600 dark:text-zinc-400">
                                {formatDate(list.created_at)}
                            </TableCell>
                            <TableCell>
                                <div className="flex justify-end gap-1">
                                    <Button
                                        variant="icon"
                                        title="Edit list name"
                                        aria-label="Edit list name"
                                        onClick={() => onEdit(list)}
                                    >
                                        <PencilIcon />
                                    </Button>
                                    <Button
                                        variant="icon"
                                        title="Download CSV"
                                        aria-label="Download CSV"
                                        onClick={() => onDownload(list)}
                                        disabled={list.total_contacts === 0}
                                    >
                                        <DownloadIcon />
                                    </Button>
                                    <Button
                                        variant="icon-danger"
                                        title="Delete contact list"
                                        aria-label="Delete contact list"
                                        onClick={() => onDelete(list)}
                                    >
                                        <TrashIcon />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );
}
