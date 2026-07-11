type SkeletonProps = {
    className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
    return (
        <div
            className={`shimmer rounded-md bg-zinc-200 dark:bg-zinc-800 ${className}`.trim()}
            aria-hidden
        />
    );
}

type TableSkeletonRowsProps = {
    columns: number;
    rows?: number;
};

export function TableSkeletonRows({
    columns,
    rows = 4,
}: TableSkeletonRowsProps) {
    return (
        <>
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <tr key={rowIndex}>
                    {Array.from({ length: columns }).map((__, colIndex) => (
                        <td key={colIndex} className="px-4 py-3">
                            <Skeleton
                                className={`h-4 ${colIndex === 0 ? "w-3/4" : "w-full"}`}
                            />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );
}
