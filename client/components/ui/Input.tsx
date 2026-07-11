import { InputHTMLAttributes, forwardRef } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
    { label, error, id, className = "", ...props },
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
            <input
                ref={ref}
                id={id}
                className={`input ${error ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""} ${className}`.trim()}
                {...props}
            />
            {error ? (
                <p className="text-xs text-red-600 dark:text-red-400">
                    {error}
                </p>
            ) : null}
        </div>
    );
});
