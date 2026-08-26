import { Skeleton } from "@/src/components/Skeleton";

export function AssetsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-10 rounded-xl" />
      {Array.from({ length: 2 }, (_, i) => (
        <div key={i} className="bg-white rounded-2xl p-3 space-y-2">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-10 rounded-xl" />
          <Skeleton className="h-10 rounded-xl" />
        </div>
      ))}
      <Skeleton className="h-8 w-56 mx-auto rounded-full" />
      <Skeleton className="h-52 rounded-2xl" />
      <Skeleton className="h-52 rounded-2xl" />
    </div>
  );
}
