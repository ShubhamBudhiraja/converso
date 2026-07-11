import { ReactNode, useEffect } from "react";

import { Button } from "@/components/ui/Button";

type OffcanvasProps = {
    open: boolean;
    title: string;
    children: ReactNode;
    onClose: () => void;
};

export function Offcanvas({ open, title, children, onClose }: OffcanvasProps) {
    useEffect(() => {
        if (!open) return;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50">
            <button
                type="button"
                aria-label="Close panel"
                className="absolute inset-0 bg-black/40"
                onClick={onClose}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="offcanvas-title"
                className="offcanvas-panel absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
            >
                <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
                    <h2
                        id="offcanvas-title"
                        className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
                    >
                        {title}
                    </h2>
                    <Button
                        variant="icon"
                        onClick={onClose}
                        aria-label="Close panel"
                        className="w-9"
                    >
                        ✕
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {children}
                </div>
            </div>
        </div>
    );
}
