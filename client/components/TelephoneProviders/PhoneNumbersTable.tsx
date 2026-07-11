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
import { PhoneNumber } from "@/lib/api";

type PhoneNumbersTableProps = {
  phoneNumbers: PhoneNumber[];
  loading: boolean;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onDelete: (number: PhoneNumber) => void;
  onRegisterElevenLabs: (number: PhoneNumber) => void;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onDeleteSelected: () => void;
};

export function PhoneNumbersTable({
  phoneNumbers,
  loading,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onDelete,
  onRegisterElevenLabs,
  page,
  pageSize,
  total,
  onPageChange,
  onDeleteSelected,
}: PhoneNumbersTableProps) {
  const pageIds = phoneNumbers.map((number) => number.id);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

  return (
    <Table
      toolbar={
        <TableToolbar
          page={page}
          pageSize={pageSize}
          total={total}
          selectedCount={selectedIds.length}
          onDeleteSelected={onDeleteSelected}
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
          <TableHeaderCell>
            <input
              type="checkbox"
              className="checkbox"
              checked={allPageSelected}
              onChange={onToggleSelectAll}
              aria-label="Select all phone numbers on this page"
            />
          </TableHeaderCell>
          <TableHeaderCell>Phone number</TableHeaderCell>
          <TableHeaderCell>Label</TableHeaderCell>
          <TableHeaderCell>ElevenLabs</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Added</TableHeaderCell>
          <TableHeaderCell align="right">Actions</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {loading ? (
          <TableSkeletonRows columns={7} rows={4} />
        ) : phoneNumbers.length === 0 ? (
          <TableEmptyState
            colSpan={7}
            emptyMessage="No phone numbers added for this account yet."
          />
        ) : (
          phoneNumbers.map((number) => (
            <TableRow key={number.id}>
              <TableCell>
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={selectedIds.includes(number.id)}
                  onChange={() => onToggleSelect(number.id)}
                  aria-label={`Select ${number.phone_number}`}
                />
              </TableCell>
              <TableCell className="font-medium text-zinc-900 dark:text-zinc-50">
                {number.phone_number}
              </TableCell>
              <TableCell className="text-zinc-700 dark:text-zinc-300">{number.label || "—"}</TableCell>
              <TableCell>
                {number.elevenlabs_phone_number_id ? (
                  <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    Registered
                  </span>
                ) : (
                  <Button
                    variant="secondary"
                    className="px-2 py-1 text-xs"
                    onClick={() => onRegisterElevenLabs(number)}
                  >
                    Register
                  </Button>
                )}
              </TableCell>
              <TableCell className="capitalize text-zinc-700 dark:text-zinc-300">{number.status}</TableCell>
              <TableCell className="text-zinc-600 dark:text-zinc-400">
                {formatDate(number.created_at)}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="icon-danger"
                  title="Delete number"
                  aria-label="Delete number"
                  onClick={() => onDelete(number)}
                >
                  <TrashIcon />
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
