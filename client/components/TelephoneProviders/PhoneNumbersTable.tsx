"use client";

import { TrashIcon } from "@/components/Icons";
import { Button } from "@/components/ui/Button";
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
};

export function PhoneNumbersTable({
  phoneNumbers,
  loading,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onDelete,
}: PhoneNumbersTableProps) {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>
            <input
              type="checkbox"
              checked={phoneNumbers.length > 0 && selectedIds.length === phoneNumbers.length}
              onChange={onToggleSelectAll}
              aria-label="Select all phone numbers"
            />
          </TableHeaderCell>
          <TableHeaderCell>Phone number</TableHeaderCell>
          <TableHeaderCell>Label</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Added</TableHeaderCell>
          <TableHeaderCell align="right">Actions</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {loading || phoneNumbers.length === 0 ? (
          <TableEmptyState
            colSpan={6}
            loading={loading}
            loadingMessage="Loading phone numbers..."
            emptyMessage="No phone numbers added for this account yet."
          />
        ) : (
          phoneNumbers.map((number) => (
            <TableRow key={number.id}>
              <TableCell>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(number.id)}
                  onChange={() => onToggleSelect(number.id)}
                  aria-label={`Select ${number.phone_number}`}
                />
              </TableCell>
              <TableCell className="font-medium text-zinc-900 dark:text-zinc-50">
                {number.phone_number}
              </TableCell>
              <TableCell className="text-zinc-700 dark:text-zinc-300">{number.label || "—"}</TableCell>
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
