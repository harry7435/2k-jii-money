import { Skeleton } from "@/src/components/Skeleton";

export function TrendSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-48 rounded-2xl" />
      <div className="space-y-2">
        <div className="flex gap-2">
          <Skeleton className="h-7 w-16 rounded-full" />
          <Skeleton className="h-7 w-16 rounded-full" />
          <Skeleton className="h-7 w-16 rounded-full" />
        </div>
        <Skeleton className="h-40 rounded-2xl" />
      </div>
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );
}
