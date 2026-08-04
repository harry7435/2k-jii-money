import { Skeleton } from "@/src/components/Skeleton";

export function TransactionsSkeleton() {
  return (
    <div className="p-4 space-y-3 md:p-6">
      <Skeleton className="h-16 rounded-2xl" />
      <div className="space-y-3 pt-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-1/3 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
            <Skeleton className="h-4 w-16 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
