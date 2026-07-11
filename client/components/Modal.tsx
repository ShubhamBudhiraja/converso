import { ReactNode } from "react";

import { Button } from "@/components/ui/Button";

type ModalProps = {
    open: boolean;
    title: string;
    children: ReactNode;
    onClose: () => void;
};

export function Modal({ open, title, children, onClose }: ModalProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Close modal"
                className="absolute inset-0 bg-black/40"
                onClick={onClose}
            />
            <div className="relative w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                        {title}
                    </h2>
                    <Button
                        variant="icon"
                        onClick={onClose}
                        aria-label="Close modal"
                        className="w-9"
                    >
                        ✕
                    </Button>
                </div>
                {children}
            </div>
        </div>
    );
}
