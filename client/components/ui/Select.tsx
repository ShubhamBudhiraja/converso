import { SelectHTMLAttributes, forwardRef } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
    label?: string;
    error?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    function Select(
        { label, error, id, className = "", children, ...props },
        ref,
    ) {
        return (
            <div className="space-y-2">
                {label ? (
                    <label
                        htmlFor={id}
                        className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                    >
                        {label}
                    </label>
                ) : null}
                <div className="relative">
                    <select
                        ref={ref}
                        id={id}
                        className={`peer input appearance-none pr-10 ${error ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""} ${className}`.trim()}
                        {...props}
                    >
                        {children}
                    </select>
                    <svg
                        aria-hidden
                        viewBox="0 0 16 16"
                        fill="none"
                        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-zinc-500 transition-colors duration-150 peer-hover:text-zinc-700 peer-disabled:text-zinc-400 dark:text-zinc-400 dark:peer-hover:text-zinc-200 dark:peer-disabled:text-zinc-600"
                    >
                        <path
                            d="M4 6l4 4 4-4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>
                {error ? (
                    <p className="text-xs text-red-600 dark:text-red-400">
                        {error}
                    </p>
                ) : null}
            </div>
        );
    },
);
