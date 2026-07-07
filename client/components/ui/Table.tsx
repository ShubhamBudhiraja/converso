import { ReactNode } from "react";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead className="bg-zinc-50 dark:bg-zinc-950">{children}</thead>;
}

export function TableBody({ children }: { children: ReactNode }) {
  return (
    <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-black">
      {children}
    </tbody>
  );
}

export function TableRow({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <tr onClick={onClick} className={`${onClick ? "selectable-row" : ""} ${className}`.trim()}>
      {children}
    </tr>
  );
}

export function TableHeaderCell({
  children,
  align = "left",
}: {
  children?: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

export function TableCell({
  children,
  className = "",
  colSpan,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  colSpan?: number;
  onClick?: (event: React.MouseEvent<HTMLTableCellElement>) => void;
}) {
  return (
    <td colSpan={colSpan} className={`px-4 py-3 ${className}`.trim()} onClick={onClick}>
      {children}
    </td>
  );
}

export function TableEmptyState({
  colSpan,
  emptyMessage,
}: {
  colSpan: number;
  emptyMessage: string;
}) {
  return (
    <TableRow>
      <TableCell className="text-center text-zinc-500" colSpan={colSpan}>
        {emptyMessage}
      </TableCell>
    </TableRow>
  );
}
