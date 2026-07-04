import { ReactNode } from "react";

import { Button } from "@/components/ui/Button";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        {eyebrow ? <p className="text-sm text-zinc-500">{eyebrow}</p> : null}
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function BulkActionsBar({
  count,
  onDelete,
  deleteLabel = "Delete selected",
}: {
  count: number;
  onDelete: () => void;
  deleteLabel?: string;
}) {
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-zinc-600 dark:text-zinc-400">{count} selected</span>
      <Button variant="danger" onClick={onDelete}>
        {deleteLabel}
      </Button>
    </div>
  );
}

export function FormActions({
  onCancel,
  submitLabel,
  loading,
  submitDisabled,
}: {
  onCancel: () => void;
  submitLabel: string;
  loading?: boolean;
  submitDisabled?: boolean;
}) {
  return (
    <div className="flex justify-end gap-3">
      <Button variant="secondary" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" disabled={loading || submitDisabled}>
        {loading ? "Please wait..." : submitLabel}
      </Button>
    </div>
  );
}
