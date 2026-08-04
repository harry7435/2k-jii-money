import { Skeleton } from "@/src/components/Skeleton";

export function SettingsSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-4 px-5 py-6 bg-white border-b border-gray-100">
        <Skeleton className="w-14 h-14 rounded-full shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-3 w-32 rounded" />
        </div>
      </div>

      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          className="bg-white mt-2 px-5 py-4 border-b border-gray-100 space-y-3"
        >
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-8 rounded-xl" />
          <Skeleton className="h-8 rounded-xl" />
        </div>
      ))}
    </div>
  );
}
