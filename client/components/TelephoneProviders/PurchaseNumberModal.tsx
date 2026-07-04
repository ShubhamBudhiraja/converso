"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Modal } from "@/components/Modal";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ApiError, NumberType, TwilioAvailableNumber } from "@/lib/api";

type SearchForm = {
  country: string;
  area_code: string;
  number_type: NumberType;
};

type PurchaseNumberModalProps = {
  open: boolean;
  loading: boolean;
  searchLoading: boolean;
  availableNumbers: TwilioAvailableNumber[];
  onClose: () => void;
  onSearch: (data: SearchForm) => Promise<TwilioAvailableNumber[]>;
  onPurchase: (data: { phone_number: string; label: string }) => Promise<void>;
};

export function PurchaseNumberModal({
  open,
  loading,
  searchLoading,
  availableNumbers,
  onClose,
  onSearch,
  onPurchase,
}: PurchaseNumberModalProps) {
  const searchForm = useForm<SearchForm>({
    defaultValues: { country: "US", area_code: "", number_type: "local" },
  });
  const labelForm = useForm<{ label: string }>({ defaultValues: { label: "" } });

  const [formError, setFormError] = useState<string | null>(null);
  const [selectedAvailable, setSelectedAvailable] = useState<TwilioAvailableNumber | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const labelValue = labelForm.watch("label");

  useEffect(() => {
    if (open) {
      searchForm.reset({ country: "US", area_code: "", number_type: "local" });
      labelForm.reset({ label: "" });
      setFormError(null);
      setSelectedAvailable(null);
      setConfirmOpen(false);
    }
  }, [open, searchForm, labelForm]);

  async function handleSearch(data: SearchForm) {
    setFormError(null);
    setSelectedAvailable(null);
    try {
      const numbers = await onSearch(data);
      if (numbers.length === 0) {
        setFormError("No available numbers found. Try different search filters.");
      }
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Failed to search available numbers");
    }
  }

  async function handlePurchaseConfirm() {
    if (!selectedAvailable) return;
    setFormError(null);
    try {
      await onPurchase({
        phone_number: selectedAvailable.phone_number,
        label: labelValue.trim(),
      });
      setConfirmOpen(false);
      onClose();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Failed to purchase phone number");
      setConfirmOpen(false);
    }
  }

  return (
    <>
      <Modal open={open} title="Purchase phone number" onClose={onClose}>
        <div className="space-y-4">
          <Alert message={formError} />

          <form onSubmit={searchForm.handleSubmit(handleSearch)} className="grid gap-3 sm:grid-cols-3">
            <Input
              id="country"
              label="Country"
              maxLength={2}
              {...searchForm.register("country", {
                onChange: (e) => {
                  e.target.value = e.target.value.toUpperCase();
                },
              })}
            />
            <Input id="area_code" label="Area code" placeholder="415" {...searchForm.register("area_code")} />
            <Select id="number_type" label="Type" {...searchForm.register("number_type")}>
              <option value="local">Local</option>
              <option value="toll_free">Toll-free</option>
              <option value="mobile">Mobile</option>
            </Select>
            <div className="sm:col-span-3">
              <Button type="submit" variant="secondary" disabled={searchLoading}>
                {searchLoading ? "Searching..." : "Search available numbers"}
              </Button>
            </div>
          </form>

          {availableNumbers.length > 0 ? (
            <div className="max-h-48 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              {availableNumbers.map((number) => {
                const selected = selectedAvailable?.phone_number === number.phone_number;
                return (
                  <button
                    key={number.phone_number}
                    type="button"
                    onClick={() => setSelectedAvailable(number)}
                    className={`selectable-item flex w-full flex-col items-start border-b border-zinc-100 px-3 py-2 text-left last:border-b-0 dark:border-zinc-800 ${
                      selected ? "bg-zinc-100 dark:bg-zinc-900" : "hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                    }`}
                  >
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">{number.phone_number}</span>
                    <span className="text-xs text-zinc-500">
                      {[number.locality, number.region].filter(Boolean).join(", ") ||
                        number.friendly_name ||
                        "—"}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {selectedAvailable ? (
            <Input
              id="purchase_label"
              label="Label"
              error={labelForm.formState.errors.label?.message}
              {...labelForm.register("label", { required: "Label is required" })}
            />
          ) : null}

          <p className="text-xs text-zinc-500">
            Purchasing a number charges your Twilio account. You will be billed by Twilio directly.
          </p>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={!selectedAvailable || !labelValue.trim() || loading}
              onClick={() => {
                setFormError(null);
                setConfirmOpen(true);
              }}
            >
              Purchase number
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm purchase?"
        description={
          <>
            Purchase <strong>{selectedAvailable?.phone_number}</strong> on your Twilio account? This will
            incur charges on your Twilio billing.
          </>
        }
        confirmLabel="Confirm purchase"
        loading={loading}
        destructive={false}
        onConfirm={handlePurchaseConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
