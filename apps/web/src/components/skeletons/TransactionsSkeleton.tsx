import { Skeleton } from "@/src/components/Skeleton";

// 실제 화면(transactions/page.tsx)의 요약 카드·목록과 같은 여백·높이를 쓴다.
// 다르면 스켈레톤 → 실제 화면 교체 때 레이아웃이 튄다.
export function TransactionsSkeleton() {
  return (
    <div>
      <Skeleton className="mx-4 mt-1 h-14 rounded-2xl md:mx-6 md:h-16" />
      <div className="mt-3 px-4 space-y-3 md:px-6">
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
