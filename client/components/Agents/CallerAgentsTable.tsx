"use client";

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
import { CallerAgent } from "@/lib/api";

type CallerAgentsTableProps = {
  agents: CallerAgent[];
  loading: boolean;
  onDelete: (agent: CallerAgent) => void;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function CallerAgentsTable({
  agents,
  loading,
  onDelete,
  page,
  pageSize,
  total,
  onPageChange,
}: CallerAgentsTableProps) {
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
          <TableHeaderCell>Phone number</TableHeaderCell>
          <TableHeaderCell>Telephone provider</TableHeaderCell>
          <TableHeaderCell>ElevenLabs account</TableHeaderCell>
          <TableHeaderCell>ElevenLabs agent</TableHeaderCell>
          <TableHeaderCell>Created</TableHeaderCell>
          <TableHeaderCell align="right">Actions</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {loading ? (
          <TableSkeletonRows columns={7} rows={4} />
        ) : agents.length === 0 ? (
          <TableEmptyState
            colSpan={7}
            emptyMessage="No caller agents yet. Create one to wire a phone number to an ElevenLabs agent for campaigns."
          />
        ) : (
          agents.map((agent) => (
            <TableRow key={agent.id}>
              <TableCell className="font-medium text-zinc-900 dark:text-zinc-50">
                {agent.name}
              </TableCell>
              <TableCell className="text-zinc-700 dark:text-zinc-300">
                {agent.phone_number}
              </TableCell>
              <TableCell className="text-zinc-700 dark:text-zinc-300">
                {agent.twilio_connection_label || "—"}
              </TableCell>
              <TableCell className="text-zinc-700 dark:text-zinc-300">
                {agent.elevenlabs_connection_label || "—"}
              </TableCell>
              <TableCell className="text-zinc-700 dark:text-zinc-300">
                {agent.elevenlabs_agent_name || agent.elevenlabs_agent_id}
              </TableCell>
              <TableCell className="text-zinc-600 dark:text-zinc-400">
                {formatDate(agent.created_at)}
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button
                    variant="icon-danger"
                    title="Delete caller agent"
                    aria-label="Delete caller agent"
                    onClick={() => onDelete(agent)}
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
