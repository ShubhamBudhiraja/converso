import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { Modal } from "@/components/Modal";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormActions } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
    ApiError,
    ContactListImportValidationError,
    ContactListValidation,
} from "@/lib/api";

type ImportContactListForm = {
    name: string;
    first_name_column: string;
    last_name_column: string;
    phone_number_column: string;
    address_column: string;
    second_phone_column: string;
    country_code: string;
};

type PendingImport = {
    file: File;
    name: string;
    first_name_column: string;
    last_name_column: string;
    phone_number_column: string;
    address_column?: string;
    second_phone_column?: string;
    country_code?: string;
};

type ImportContactListModalProps = {
    open: boolean;
    loading: boolean;
    onClose: () => void;
    onSubmit: (
        data: PendingImport & { accept_partial?: boolean },
    ) => Promise<void>;
};

function parseCsvHeaders(file: File): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const text = String(reader.result ?? "");
            const firstLine = text.split(/\r?\n/)[0] ?? "";
            const headers = firstLine
                .split(",")
                .map((header) => header.trim().replace(/^"|"$/g, ""));
            resolve(headers.filter(Boolean));
        };
        reader.onerror = () => reject(new Error("Failed to read CSV file"));
        reader.readAsText(file.slice(0, 64 * 1024));
    });
}

function formatErrorGroup(label: string, rows: number[]): string {
    return `${label}: Row ${rows.join(", ")}.`;
}

export function ImportContactListModal({
    open,
    loading,
    onClose,
    onSubmit,
}: ImportContactListModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<ImportContactListForm>({
        defaultValues: {
            name: "",
            first_name_column: "",
            last_name_column: "",
            phone_number_column: "",
            address_column: "",
            second_phone_column: "",
            country_code: "+1",
        },
    });
    const [formError, setFormError] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [headers, setHeaders] = useState<string[]>([]);
    const [headersLoading, setHeadersLoading] = useState(false);
    const [step, setStep] = useState<"form" | "review">("form");
    const [validation, setValidation] = useState<ContactListValidation | null>(
        null,
    );
    const [pendingImport, setPendingImport] = useState<PendingImport | null>(
        null,
    );

    const selectedFile = watch("name");

    useEffect(() => {
        if (!open) {
            reset();
            setFile(null);
            setHeaders([]);
            setFormError(null);
            setStep("form");
            setValidation(null);
            setPendingImport(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    }, [open, reset]);

    async function handleFileChange(nextFile: File | null) {
        setFile(nextFile);
        setHeaders([]);
        setStep("form");
        setValidation(null);
        setPendingImport(null);
        if (!nextFile) return;

        setHeadersLoading(true);
        try {
            const parsed = await parseCsvHeaders(nextFile);
            setHeaders(parsed);
            const lower = parsed.map((header) => header.toLowerCase());
            const guess = (candidates: string[]) =>
                parsed[
                    lower.findIndex((header) => candidates.includes(header))
                ] ?? "";

            setValue(
                "first_name_column",
                guess(["first_name", "firstname", "first name", "fname"]),
            );
            setValue(
                "last_name_column",
                guess(["last_name", "lastname", "last name", "lname"]),
            );
            setValue(
                "phone_number_column",
                guess([
                    "phone",
                    "phone_number",
                    "phonenumber",
                    "mobile",
                    "cell",
                ]),
            );
            if (!selectedFile) {
                setValue("name", nextFile.name.replace(/\.csv$/i, ""));
            }
        } catch (err) {
            setFormError(
                err instanceof Error
                    ? err.message
                    : "Failed to read CSV headers",
            );
        } finally {
            setHeadersLoading(false);
        }
    }

    function resetUpload() {
        setFile(null);
        setHeaders([]);
        setStep("form");
        setValidation(null);
        setPendingImport(null);
        setFormError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }

    async function submitImport(
        data: PendingImport,
        options?: { accept_partial?: boolean; closeOnSuccess?: boolean },
    ) {
        setFormError(null);
        try {
            await onSubmit({
                ...data,
                accept_partial: options?.accept_partial,
            });
            if (options?.closeOnSuccess ?? true) {
                onClose();
            }
        } catch (err) {
            if (err instanceof ContactListImportValidationError) {
                setPendingImport(data);
                setValidation(err.validation);
                setStep("review");
                return;
            }
            setFormError(
                err instanceof ApiError
                    ? err.message
                    : "Failed to import contact list",
            );
        }
    }

    return (
        <Modal
            open={open}
            title={
                step === "review" ? "CSV errors found" : "Import contact list"
            }
            onClose={onClose}
        >
            {step === "review" && validation ? (
                <div className="space-y-4">
                    <Alert message={formError} />

                    <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                        {validation.error_groups.map((group) => (
                            <p key={group.label}>
                                {formatErrorGroup(group.label, group.rows)}
                            </p>
                        ))}
                    </div>

                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {validation.can_import_partial
                            ? `Your CSV has some errors. ${validation.valid_count} of ${validation.total_rows} rows are valid. Would you like to save the valid rows or upload a new CSV?`
                            : "Your CSV has errors and no valid rows were found. Upload a new CSV to try again."}
                    </p>

                    <div className="flex justify-end gap-3">
                        <Button
                            variant="secondary"
                            onClick={resetUpload}
                            disabled={loading}
                        >
                            Upload new CSV
                        </Button>
                        {validation.can_import_partial ? (
                            <Button
                                onClick={() => {
                                    if (!pendingImport) return;
                                    void submitImport(pendingImport, {
                                        accept_partial: true,
                                    });
                                }}
                                disabled={loading}
                            >
                                {loading ? "Saving..." : "Save valid rows"}
                            </Button>
                        ) : null}
                    </div>
                </div>
            ) : (
                <form
                    className="space-y-4"
                    onSubmit={handleSubmit(async (values) => {
                        if (!file) {
                            setFormError("Choose a CSV file to import");
                            return;
                        }
                        await submitImport(
                            {
                                file,
                                name: values.name,
                                first_name_column: values.first_name_column,
                                last_name_column: values.last_name_column,
                                phone_number_column: values.phone_number_column,
                                address_column:
                                    values.address_column || undefined,
                                second_phone_column:
                                    values.second_phone_column || undefined,
                                country_code: values.country_code || "+1",
                            },
                            { closeOnSuccess: true },
                        );
                    })}
                >
                    <Alert message={formError} />

                    <div>
                        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            CSV file
                        </label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,text/csv"
                            className="input w-full"
                            onChange={(event) => {
                                const nextFile =
                                    event.target.files?.[0] ?? null;
                                void handleFileChange(nextFile);
                            }}
                        />
                    </div>

                    <Input
                        label="List name"
                        error={errors.name?.message}
                        {...register("name", {
                            required: "List name is required",
                        })}
                    />

                    <Select
                        label="First name column"
                        disabled={headersLoading || headers.length === 0}
                        error={errors.first_name_column?.message}
                        {...register("first_name_column", {
                            required: "Required",
                        })}
                    >
                        <option value="">Select column</option>
                        {headers.map((header) => (
                            <option key={header} value={header}>
                                {header}
                            </option>
                        ))}
                    </Select>

                    <Select
                        label="Last name column"
                        disabled={headersLoading || headers.length === 0}
                        error={errors.last_name_column?.message}
                        {...register("last_name_column", {
                            required: "Required",
                        })}
                    >
                        <option value="">Select column</option>
                        {headers.map((header) => (
                            <option key={header} value={header}>
                                {header}
                            </option>
                        ))}
                    </Select>

                    <Select
                        label="Phone number column"
                        disabled={headersLoading || headers.length === 0}
                        error={errors.phone_number_column?.message}
                        {...register("phone_number_column", {
                            required: "Required",
                        })}
                    >
                        <option value="">Select column</option>
                        {headers.map((header) => (
                            <option key={header} value={header}>
                                {header}
                            </option>
                        ))}
                    </Select>

                    <Select
                        label="Address column (optional)"
                        disabled={headersLoading || headers.length === 0}
                        {...register("address_column")}
                    >
                        <option value="">None</option>
                        {headers.map((header) => (
                            <option key={header} value={header}>
                                {header}
                            </option>
                        ))}
                    </Select>

                    <Input
                        label="Default country code"
                        {...register("country_code")}
                    />

                    <FormActions
                        onCancel={onClose}
                        submitLabel={loading ? "Importing..." : "Import list"}
                        loading={loading}
                    />
                </form>
            )}
        </Modal>
    );
}
