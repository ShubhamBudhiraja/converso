type StatusBadgeProps = {
    valid: boolean;
};

export function StatusBadge({ valid }: StatusBadgeProps) {
    return (
        <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                valid
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
            }`}
        >
            {valid ? "Valid" : "Not verified"}
        </span>
    );
}
