import { Skeleton } from "@/src/components/Skeleton";

export function BudgetSkeleton() {
  return (
    <div className="p-4 space-y-3 md:p-6">
      <Skeleton className="h-36 rounded-2xl" />
      <div className="space-y-1 pt-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
