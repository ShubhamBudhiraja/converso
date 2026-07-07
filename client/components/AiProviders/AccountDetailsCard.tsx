import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/format";
import { ElevenLabsConnection } from "@/lib/api";

type AccountDetailsCardProps = {
  connection: ElevenLabsConnection;
  testLoading: boolean;
  testMessage: string | null;
  onTestAgain: () => void;
};

export function AccountDetailsCard({
  connection,
  testLoading,
  testMessage,
  onTestAgain,
}: AccountDetailsCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
      <h2 className="mb-4 text-sm font-medium text-zinc-500">Account details</h2>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="text-xs text-zinc-500">Label</dt>
          <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {connection.label || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">API key</dt>
          <dd className="mt-1 font-mono text-sm text-zinc-900 dark:text-zinc-50">
            {connection.api_key_masked}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Status</dt>
          <dd className="mt-1">
            <StatusBadge valid={connection.is_valid} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Agents</dt>
          <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {connection.agent_count}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Last tested</dt>
          <dd className="mt-1 space-y-2">
            <p className="text-sm text-zinc-900 dark:text-zinc-50">
              {formatDate(connection.last_tested_at)}
            </p>
            <Button
              variant="secondary"
              onClick={onTestAgain}
              disabled={testLoading}
              className="px-3 py-1.5 text-xs"
            >
              {testLoading ? "Testing..." : "Test again"}
            </Button>
            {testMessage ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{testMessage}</p>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Connected</dt>
          <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
            {formatDate(connection.created_at)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
