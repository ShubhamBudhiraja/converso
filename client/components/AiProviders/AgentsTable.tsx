"use client";

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
import { ElevenLabsAgent } from "@/lib/api";

type AgentsTableProps = {
  agents: ElevenLabsAgent[];
  loading: boolean;
  selectedIds: string[];
  onToggleSelect: (agentId: string) => void;
  onToggleSelectAll: () => void;
  onEdit: (agent: ElevenLabsAgent) => void;
  onDelete: (agent: ElevenLabsAgent) => void;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onDeleteSelected: () => void;
};

export function AgentsTable({
  agents,
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
}: AgentsTableProps) {
  const pageIds = agents.map((agent) => agent.agent_id);
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
              aria-label="Select all agents on this page"
            />
          </TableHeaderCell>
          <TableHeaderCell>Name</TableHeaderCell>
          <TableHeaderCell>Agent ID</TableHeaderCell>
          <TableHeaderCell align="right">Actions</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {loading ? (
          <TableSkeletonRows columns={4} rows={3} />
        ) : agents.length === 0 ? (
          <TableEmptyState
            colSpan={4}
            emptyMessage="No conversational AI agents found on this ElevenLabs account."
          />
        ) : (
          agents.map((agent) => (
            <TableRow key={agent.agent_id}>
              <TableCell>
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={selectedIds.includes(agent.agent_id)}
                  onChange={() => onToggleSelect(agent.agent_id)}
                  aria-label={`Select ${agent.name}`}
                />
              </TableCell>
                            <TableCell className="font-medium text-zinc-900 dark:text-zinc-50">
                                {agent.name}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                                {agent.agent_id}
                            </TableCell>
                            <TableCell>
                                <div className="flex justify-end gap-1">
                                    <Button
                                        variant="icon"
                                        title="Edit agent"
                                        aria-label="Edit agent"
                                        onClick={() => onEdit(agent)}
                                    >
                                        <PencilIcon />
                                    </Button>
                                    <Button
                                        variant="icon-danger"
                                        title="Delete agent"
                                        aria-label="Delete agent"
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
