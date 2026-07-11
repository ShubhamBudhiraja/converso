import { Button } from "@/components/ui/Button";
import { TableToolbarBar } from "@/components/ui/Table";
import { formatShowingRange } from "@/lib/table-pagination";

type TableToolbarProps = {
    page: number;
    pageSize: number;
    total: number;
    selectedCount?: number;
    onDeleteSelected?: () => void;
    deleteLabel?: string;
};

export function TableToolbar({
    page,
    pageSize,
    total,
    selectedCount = 0,
    onDeleteSelected,
    deleteLabel = "Delete selected",
}: TableToolbarProps) {
    return (
        <TableToolbarBar>
            <span className="text-sm text-zinc-600 dark:text-zinc-400 leading-[34px]">
                {formatShowingRange(page, pageSize, total)}
            </span>

            {selectedCount > 0 && onDeleteSelected ? (
                <Button variant="danger" onClick={onDeleteSelected}>
                    {deleteLabel} ({selectedCount})
                </Button>
            ) : null}
        </TableToolbarBar>
    );
}
