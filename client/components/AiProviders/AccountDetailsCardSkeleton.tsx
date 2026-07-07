import { Skeleton } from "@/components/ui/Skeleton";

export function AccountDetailsCardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
      <Skeleton className="mb-4 h-4 w-28" />
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index}>
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2 h-4 w-full max-w-[12rem]" />
          </div>
        ))}
      </dl>
    </div>
  );
}
