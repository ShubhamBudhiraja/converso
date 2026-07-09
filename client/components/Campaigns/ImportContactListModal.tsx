"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Modal } from "@/components/Modal";
import { Alert } from "@/components/ui/Alert";
import { FormActions } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ApiError } from "@/lib/api";

type ImportContactListForm = {
  name: string;
  first_name_column: string;
  last_name_column: string;
  phone_number_column: string;
  address_column: string;
  second_phone_column: string;
  country_code: string;
};

type ImportContactListModalProps = {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (data: {
    file: File;
    name: string;
    first_name_column: string;
    last_name_column: string;
    phone_number_column: string;
    address_column?: string;
    second_phone_column?: string;
    country_code?: string;
  }) => Promise<void>;
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

export function ImportContactListModal({
  open,
  loading,
  onClose,
  onSubmit,
}: ImportContactListModalProps) {
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

  const selectedFile = watch("name");

  useEffect(() => {
    if (!open) {
      reset();
      setFile(null);
      setHeaders([]);
      setFormError(null);
    }
  }, [open, reset]);

  async function handleFileChange(nextFile: File | null) {
    setFile(nextFile);
    setHeaders([]);
    if (!nextFile) return;

    setHeadersLoading(true);
    try {
      const parsed = await parseCsvHeaders(nextFile);
      setHeaders(parsed);
      const lower = parsed.map((header) => header.toLowerCase());
      const guess = (candidates: string[]) =>
        parsed[lower.findIndex((header) => candidates.includes(header))] ?? "";

      setValue("first_name_column", guess(["first_name", "firstname", "first name", "fname"]));
      setValue("last_name_column", guess(["last_name", "lastname", "last name", "lname"]));
      setValue(
        "phone_number_column",
        guess(["phone", "phone_number", "phonenumber", "mobile", "cell"]),
      );
      if (!selectedFile) {
        setValue("name", nextFile.name.replace(/\.csv$/i, ""));
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to read CSV headers");
    } finally {
      setHeadersLoading(false);
    }
  }

  return (
    <Modal open={open} title="Import contact list" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={handleSubmit(async (values) => {
          setFormError(null);
          if (!file) {
            setFormError("Choose a CSV file to import");
            return;
          }
          try {
            await onSubmit({
              file,
              name: values.name,
              first_name_column: values.first_name_column,
              last_name_column: values.last_name_column,
              phone_number_column: values.phone_number_column,
              address_column: values.address_column || undefined,
              second_phone_column: values.second_phone_column || undefined,
              country_code: values.country_code || "+1",
            });
            onClose();
          } catch (err) {
            setFormError(
              err instanceof ApiError ? err.message : "Failed to import contact list",
            );
          }
        })}
      >
        <Alert message={formError} />

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            CSV file
          </label>
          <input
            type="file"
            accept=".csv,text/csv"
            className="input w-full"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null;
              void handleFileChange(nextFile);
            }}
          />
        </div>

        <Input
          label="List name"
          error={errors.name?.message}
          {...register("name", { required: "List name is required" })}
        />

        <Select
          label="First name column"
          disabled={headersLoading || headers.length === 0}
          error={errors.first_name_column?.message}
          {...register("first_name_column", { required: "Required" })}
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
          {...register("last_name_column", { required: "Required" })}
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
          {...register("phone_number_column", { required: "Required" })}
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
    </Modal>
  );
}
