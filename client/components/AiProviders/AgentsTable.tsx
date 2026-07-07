"use client";

import { PencilIcon, TrashIcon } from "@/components/Icons";
import { Button } from "@/components/ui/Button";
import { TableSkeletonRows } from "@/components/ui/Skeleton";
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
  onEdit: (agent: ElevenLabsAgent) => void;
  onDelete: (agent: ElevenLabsAgent) => void;
};

export function AgentsTable({ agents, loading, onEdit, onDelete }: AgentsTableProps) {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Name</TableHeaderCell>
          <TableHeaderCell>Agent ID</TableHeaderCell>
          <TableHeaderCell align="right">Actions</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {loading ? (
          <TableSkeletonRows columns={3} rows={3} />
        ) : agents.length === 0 ? (
          <TableEmptyState
            colSpan={3}
            emptyMessage="No conversational AI agents found on this ElevenLabs account."
          />
        ) : (
          agents.map((agent) => (
            <TableRow key={agent.agent_id}>
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
