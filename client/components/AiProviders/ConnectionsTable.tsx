"use client";

import { useRouter } from "next/navigation";

import { PencilIcon, TrashIcon } from "@/components/Icons";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
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
import { ElevenLabsConnection } from "@/lib/api";

type ConnectionsTableProps = {
  connections: ElevenLabsConnection[];
  loading: boolean;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onEdit: (connection: ElevenLabsConnection) => void;
  onDelete: (connection: ElevenLabsConnection) => void;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onDeleteSelected: () => void;
};

export function ConnectionsTable({
  connections,
  loading,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onDelete,
  page,
  pageSize,
  total,
  onPageChange,
  onDeleteSelected,
}: ConnectionsTableProps) {
  const router = useRouter();
  const pageIds = connections.map((connection) => connection.id);
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
              aria-label="Select all accounts on this page"
            />
          </TableHeaderCell>
          <TableHeaderCell>Label</TableHeaderCell>
          <TableHeaderCell>API key</TableHeaderCell>
          <TableHeaderCell>Agents</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Last tested</TableHeaderCell>
          <TableHeaderCell align="right">Actions</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {loading ? (
          <TableSkeletonRows columns={7} rows={4} />
        ) : connections.length === 0 ? (
          <TableEmptyState
            colSpan={7}
            emptyMessage="No ElevenLabs accounts connected yet."
          />
        ) : (
          connections.map((connection) => (
            <TableRow
              key={connection.id}
              onClick={() => router.push(`/ai-providers/${connection.id}`)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={selectedIds.includes(connection.id)}
                  onChange={() => onToggleSelect(connection.id)}
                  aria-label={`Select ${connection.label ?? connection.api_key_masked}`}
                />
              </TableCell>
              <TableCell className="font-medium text-zinc-900 dark:text-zinc-50">
                {connection.label || "—"}
              </TableCell>
              <TableCell className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                {connection.api_key_masked}
              </TableCell>
              <TableCell className="text-zinc-700 dark:text-zinc-300">
                {connection.agent_count}
              </TableCell>
              <TableCell>
                <StatusBadge valid={connection.is_valid} />
              </TableCell>
              <TableCell className="text-zinc-600 dark:text-zinc-400">
                {formatDate(connection.last_tested_at)}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-end gap-1">
                  <Button
                    variant="icon"
                    title="Edit label"
                    aria-label="Edit label"
                    onClick={() => onEdit(connection)}
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    variant="icon-danger"
                    title="Delete account"
                    aria-label="Delete account"
                    onClick={() => onDelete(connection)}
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
